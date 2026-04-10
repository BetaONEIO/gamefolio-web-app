import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, X, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  receiver: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
  };
}

export function MessageDialog({ open, onOpenChange, targetUser }: MessageDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/messages", targetUser.id],
    queryFn: async () => {
      if (!targetUser.id) return [];
      const response = await apiRequest("GET", `/api/messages/${targetUser.id}`);
      return response.json();
    },
    enabled: open && !!targetUser.id && !!user,
    refetchInterval: open ? 3000 : false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, receiverId }: { content: string; receiverId: number }) => {
      await apiRequest("POST", "/api/messages", { content, receiverId });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", targetUser.id]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/conversations"]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !targetUser.id) return;
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      receiverId: targetUser.id,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {targetUser.nftProfileTokenId && targetUser.nftProfileImageUrl && (targetUser as any).activeProfilePicType === 'nft' ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                <img src={targetUser.nftProfileImageUrl} alt={targetUser.displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={targetUser.avatarUrl || ""} alt={targetUser.displayName} />
                <AvatarFallback className="bg-primary/20">
                  {targetUser.displayName?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">
                {targetUser.displayName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">@{targetUser.username}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(messages as Message[]).map((message) => {
                const isOwnMessage = message.senderId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] opacity-70">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                        {isOwnMessage && (
                          message.isRead ? (
                            <CheckCheck className="h-3 w-3 opacity-70" />
                          ) : (
                            <Check className="h-3 w-3 opacity-70" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              size="icon"
              className="shrink-0"
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
