import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Trash2, UserX, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  isRead: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversationUsername, setNewConversationUsername] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  // Check for target user from URL parameters - run only once
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user');
    
    console.log('🔍 CHECKING URL PARAMS - Target user:', targetUsername);
    console.log('👤 User authenticated:', !!user);
    console.log('🏠 Current location:', location);
    console.log('💬 Current selectedConversation:', selectedConversation?.username);
    
    if (targetUsername && user && !selectedConversation) {
      console.log('🎯 Found target user in URL, creating conversation for:', targetUsername);
      
      // Clear URL parameter immediately
      window.history.replaceState({}, '', '/messages');
      
      const mockConversation: Conversation = {
        userId: 0,
        username: targetUsername,
        displayName: targetUsername,
        avatarUrl: undefined,
        lastMessage: "",
        lastMessageTime: new Date().toISOString(),
        isRead: true
      };
      
      console.log('📝 Setting selected conversation to:', mockConversation);
      setSelectedConversation(mockConversation);
      setNewConversationUsername(targetUsername);
      console.log('✅ Conversation created, should show "Start a conversation with @' + targetUsername + '"');
    } else if (targetUsername && !user) {
      console.log('⏳ Target user found but user not authenticated yet');
    } else if (targetUsername && selectedConversation) {
      console.log('ℹ️ Target user found but conversation already selected:', selectedConversation.username);
    }
  }, [user, location, selectedConversation]); // Include selectedConversation to prevent overrides

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
  });



  // Update mock conversation with real one when conversations load (only if we have one)
  useEffect(() => {
    if (selectedConversation && selectedConversation.userId === 0 && conversations.length > 0) {
      const existingConversation = conversations.find(c => c.username === selectedConversation.username);
      if (existingConversation) {
        console.log('🔄 Updating mock conversation with real one');
        setSelectedConversation(existingConversation);
      } else {
        console.log('⚠️ No existing conversation found, keeping mock conversation for:', selectedConversation.username);
      }
    }
  }, [conversations]);

  // Debug effect to track selectedConversation changes
  useEffect(() => {
    console.log('🔍 SELECTED CONVERSATION CHANGED:', selectedConversation?.username || 'null');
  }, [selectedConversation]); // Remove selectedConversation dependency to prevent loops

  // Fetch messages for selected conversation (skip for mock conversations)
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversation?.userId],
    enabled: !!selectedConversation && selectedConversation.userId !== 0,
    refetchOnWindowFocus: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: number; content: string }) => {
      return await apiRequest("POST", "/api/messages", { receiverId, content });
    },
    onSuccess: (data) => {
      setNewMessage("");
      // Immediately invalidate and refetch the messages for the current conversation
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation?.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      // Force refetch
      queryClient.refetchQueries({ queryKey: ["/api/messages", selectedConversation?.userId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async ({ username, content }: { username: string; content: string }) => {
      return await apiRequest("POST", "/api/messages/new", { username, content });
    },
    onSuccess: (data) => {
      setNewConversationUsername("");
      setNewConversationMessage("");
      setIsNewConversationOpen(false);
      
      // First invalidate conversations to get updated list
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      
      // Create conversation object for immediate selection
      const newConversation: Conversation = {
        userId: data.receiverId,
        username: data.receiverUsername,
        displayName: data.receiverDisplayName,
        avatarUrl: data.receiverAvatarUrl,
        lastMessage: data.content,
        lastMessageTime: data.createdAt,
        isRead: true
      };
      
      setSelectedConversation(newConversation);
      
      toast({
        title: "Success",
        description: "Message sent successfully",
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

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation?.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("POST", "/api/users/block", { userId });
    },
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({
        title: "Success",
        description: "User blocked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    // If this is a mock conversation (userId = 0), use the start conversation API
    if (selectedConversation.userId === 0) {
      startConversationMutation.mutate({
        username: selectedConversation.username,
        content: newMessage.trim(),
      });
    } else {
      sendMessageMutation.mutate({
        receiverId: selectedConversation.userId,
        content: newMessage.trim(),
      });
    }
  };

  const handleStartConversation = () => {
    if (!newConversationUsername.trim() || !newConversationMessage.trim()) return;
    
    startConversationMutation.mutate({
      username: newConversationUsername.trim(),
      content: newConversationMessage.trim(),
    });
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleBlockUser = (userId: number) => {
    blockUserMutation.mutate(userId);
  };

  if (!user) {
    return <div>Please log in to view messages</div>;
  }

  if (!user.messagingEnabled) {
    return (
      <div className="h-screen bg-navy text-white flex items-center justify-center">
        <Card className="max-w-md mx-auto bg-navy-light border-navy-light">
          <CardContent className="p-8">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2 text-white">Messaging Disabled</h2>
            <p className="text-gray-400 mb-4">
              You have disabled messaging for your account. To use messaging, please enable it in your settings.
            </p>
            <Button 
              onClick={() => window.location.href = "/settings/profile"}
              className="bg-green text-black hover:bg-green/90"
            >
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-navy text-white">
      <div className="flex h-full">
        {/* Left Sidebar - Conversations */}
        <div className="w-80 border-r border-navy-light flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-navy-light">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Messages</h1>
              <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-navy-light hover:bg-navy-light">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-navy border-navy-light">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      {newConversationUsername && (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`/api/static/gamefolio%20social%20logo%203d%20circle%20web.png`} />
                          <AvatarFallback>
                            {newConversationUsername[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      Start New Conversation
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {newConversationUsername ? 
                        `Start a conversation with @${newConversationUsername}` :
                        "Enter a username and your message to start a new conversation."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Username"
                      value={newConversationUsername}
                      onChange={(e) => setNewConversationUsername(e.target.value)}
                      disabled={!!newConversationUsername}
                      className="bg-navy-light border-navy-light"
                    />
                    <Textarea
                      placeholder="Your message..."
                      value={newConversationMessage}
                      onChange={(e) => setNewConversationMessage(e.target.value)}
                      rows={3}
                      className="bg-navy-light border-navy-light"
                    />
                    <Button
                      onClick={handleStartConversation}
                      disabled={startConversationMutation.isPending}
                      className="w-full bg-green text-black hover:bg-green/90"
                    >
                      {startConversationMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Search Box */}
            <div className="relative">
              <Input
                placeholder="Search Direct Messages"
                className="bg-navy-light border-navy-light pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              <div>
                {conversations.map((conversation) => (
                  <div
                    key={conversation.userId}
                    className={`flex items-center gap-3 p-4 hover:bg-navy-light cursor-pointer transition-colors ${
                      selectedConversation?.userId === conversation.userId
                        ? "bg-navy-light"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.avatarUrl} />
                      <AvatarFallback className="bg-navy-light">
                        {conversation.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate text-white">
                            {conversation.displayName}
                          </p>
                          {!conversation.isRead && (
                            <div className="w-2 h-2 bg-green rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                            addSuffix: true,
                          }).replace('about ', '')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Side - Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-navy-light flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedConversation.avatarUrl} />
                    <AvatarFallback className="bg-navy-light">
                      {selectedConversation.displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">
                      {selectedConversation.displayName}
                    </p>
                    <p className="text-sm text-gray-500">
                      @{selectedConversation.username}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-navy-light hover:bg-navy-light">
                      <UserX className="w-4 h-4 mr-2" />
                      Block
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-navy border-navy-light">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Block User</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Are you sure you want to block @{selectedConversation.username}?
                        This will prevent them from sending you messages and you won't be able to send them messages either.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-navy-light border-navy-light hover:bg-navy-light/80">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBlockUser(selectedConversation.userId)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Block User
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConversation?.userId === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="mb-2">Start a conversation with @{selectedConversation.username}</p>
                      <p className="text-sm">Send your first message below</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === user.id ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            message.senderId === user.id
                              ? "bg-green text-black"
                              : "bg-navy-light text-white"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1 gap-2">
                            <p className="text-xs opacity-70">
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                            {message.senderId === user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 hover:bg-red-500/10"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-navy-light">
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Start a new message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="flex-1 bg-navy-light border-navy-light resize-none rounded-2xl"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(sendMessageMutation.isPending || startConversationMutation.isPending) || !newMessage.trim()}
                    size="sm"
                    className="bg-green hover:bg-green/90 text-black rounded-full p-2 h-8 w-8"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h2 className="text-xl font-medium text-white mb-2">Select a message</h2>
                <p className="text-gray-500">
                  Choose from your existing conversations, start a new one, or just keep swimming.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}