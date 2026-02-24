import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomInput } from "@/components/ui/custom-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  Send,
  Search,
  UserPlus,
  MoreVertical,
  Trash2,
  MessageSquare,
  Users,
  Shield,
  ShieldOff,
  ArrowLeft,
  X,
  UserCheck,
  Check,
  CheckCheck,
  CornerDownRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDistanceToNow } from "date-fns";
import { VerificationGuard } from "@/components/auth/verification-guard";
import { useSignedUrl } from "@/hooks/use-signed-url";

const SignedAvatar: React.FC<{ url: string | null | undefined; fallback: string; className?: string }> = ({ url, fallback, className }) => {
  const { signedUrl } = useSignedUrl(url);
  return (
    <Avatar className={className}>
      <AvatarImage src={signedUrl || ''} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
};


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

interface Conversation {
  userId: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processedUrlParam, setProcessedUrlParam] = useState<string | null>(null);
  const [showMobileConversationList, setShowMobileConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({
    queryKey: ["/api/messages/conversations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages/conversations");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const { data: conversations = [], isLoading: loadingConversations } = conversationsQuery;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await apiRequest("GET", `/api/messages/${selectedConversation}`);
      return response.json();
    },
    enabled: !!selectedConversation && !!user,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["/api/users/blocked"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users/blocked");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Search users mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(query)}`);
      return response.json();
    },
    onSuccess: (data: any) => {
      setUserSearchResults(data || []);
      setIsSearching(false);
    },
    onError: () => {
      setUserSearchResults([]);
      setIsSearching(false);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "gamefolioError",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, receiverId }: { content: string; receiverId: number }) => {
      // Check if user is blocked before sending
      const isBlocked = blockedUsers.some(
        (blockedUser: any) => blockedUser.id === receiverId || blockedUser.userId === receiverId
      );

      if (isBlocked) {
        throw new Error("Cannot send message to blocked user");
      }

      await apiRequest("POST", "/api/messages", { content, receiverId });
    },
    onSuccess: () => {
      setNewMessage("");
      if (selectedConversation) {
        queryClient.invalidateQueries({
          queryKey: ["/api/messages", selectedConversation]
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/messages/conversations"]
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "gamefolioError",
      });
    },
  });

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: number; content: string }) => {
      const response = await apiRequest("POST", "/api/messages", { receiverId: userId, content });
      return response.json();
    },
    onSuccess: (data: any, variables: { userId: number; content: string }) => {
      setNewMessage("");
      setIsNewConversationOpen(false);
      setUserSearchQuery("");
      setUserSearchResults([]);
      // Set the new conversation as selected
      setSelectedConversation(variables.userId);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "gamefolioError",
      });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log(`Attempting to block user ${userId}`);
      const response = await apiRequest("POST", "/api/users/block", { userId });
      console.log(`Block response:`, response);
      return response;
    },
    onSuccess: (data: any, userId: number) => {
      const conversation = (conversations as any[]).find((conv: any) => conv.userId === userId);
      const username = conversation?.user?.username || 'User';

      console.log(`Successfully blocked user ${userId} (${username})`);

      setSelectedConversation(null);
      setSelectedUserInfo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/blocked"] });

      // Show prominent success feedback
      toast({
        title: "✅ User blocked successfully",
        description: `${username} has been blocked. They can no longer send you messages or interact with your content.`,
        className: "border-green-500 bg-green-50 dark:bg-green-950",
      });
    },
    onError: (error: any) => {
      console.error(`Failed to block user:`, error);
      toast({
        title: "❌ Failed to block user",
        description: error.message || "Unable to block user. Please try again.",
        variant: "gamefolioError",
      });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log(`Attempting to unblock user ${userId}`);
      const response = await apiRequest("POST", "/api/users/unblock", { userId });
      console.log(`Unblock response:`, response);
      return response;
    },
    onSuccess: (data: any, userId: number) => {
      const conversation = (conversations as any[]).find((conv: any) => conv.userId === userId);
      const username = conversation?.user?.username || 'User';

      console.log(`Successfully unblocked user ${userId} (${username})`);

      queryClient.invalidateQueries({ queryKey: ["/api/users/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });

      // Show success feedback
      toast({
        title: "✅ User unblocked successfully",
        description: `${username} has been unblocked. You can now send messages to each other.`,
        className: "border-green-500 bg-green-50 dark:bg-green-950",
      });
    },
    onError: (error: any) => {
      console.error(`Failed to unblock user:`, error);
      toast({
        title: "❌ Failed to unblock user",
        description: error.message || "Unable to unblock user. Please try again.",
        variant: "gamefolioError",
      });
    },
  });




  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/${messageId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({
        title: "Message deleted",
        description: "The message has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "gamefolioError",
      });
    },
  });

  // Delete conversation history mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/conversations/${userId}`);
      return response;
    },
    onSuccess: () => {
      setSelectedConversation(null); // Clear selected conversation
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({
        title: "Conversation deleted",
        description: "The entire conversation history has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "gamefolioError",
      });
    },
  });

  // Handle URL parameter for direct messaging
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user');

    // Wait for conversations to load and avoid processing same parameter multiple times
    if (targetUsername && targetUsername !== user?.username && targetUsername !== processedUrlParam && !searchUsersMutation.isPending && conversationsQuery.isSuccess) {
      console.log('🎯 TARGET USER FROM URL:', targetUsername);
      console.log('📋 Current conversations:', (conversations as any[]).map((c: any) => ({ userId: c.userId, username: c.user?.username })));
      setProcessedUrlParam(targetUsername); // Mark this parameter as processed

      // Check if conversation already exists
      const existingConversation = (conversations as any[]).find((c: any) => c.user?.username === targetUsername);

      if (existingConversation) {
        console.log('✅ Found existing conversation:', existingConversation);
        console.log('🔄 Setting selected conversation to userId:', existingConversation.userId);
        setSelectedConversation(existingConversation.userId);
        setSelectedUserInfo(null); // Clear any stored user info since we have a real conversation
        setShowMobileConversationList(false); // Show chat on mobile when conversation is selected via URL
        // Clean up the URL immediately for existing conversations
        window.history.replaceState({}, '', '/messages');
        console.log('✅ Conversation selection and URL cleanup complete');
      } else {
        // Search for user to create new conversation
        console.log('🆕 No existing conversation found, will search for user:', targetUsername);
        console.log('🔍 Triggering user search mutation...');
        searchUsersMutation.mutate(targetUsername);
      }
    }
  }, [conversations, user?.username, searchUsersMutation.isPending, processedUrlParam, conversationsQuery.isSuccess]);

  // When search results come back, if we have a target user from URL, select them
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user');

    if (targetUsername && userSearchResults.length > 0) {
      const targetUser = userSearchResults.find(u => u.username === targetUsername);
      if (targetUser) {
        console.log('🎯 Found target user from search, selecting conversation:', targetUser);
        setSelectedConversation(targetUser.id);
        setSelectedUserInfo(targetUser); // Store user info for header display
        setShowMobileConversationList(false); // Show chat on mobile when new conversation is selected via URL
        setUserSearchResults([]); // Clear search results
        setProcessedUrlParam(null); // Reset so URL can be processed again if needed
        // Clean up the URL after successfully setting up the new conversation
        window.history.replaceState({}, '', '/messages');
      }
    }
  }, [userSearchResults]);


  // Handle user search with debouncing
  useEffect(() => {
    // Strip @ symbol if user types it (usernames don't include @)
    const cleanQuery = userSearchQuery.startsWith('@') ? userSearchQuery.slice(1) : userSearchQuery;
    
    if (cleanQuery.length > 1) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        searchUsersMutation.mutate(cleanQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setUserSearchResults([]);
      setIsSearching(false);
    }
  }, [userSearchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if conversation exists but we have messages (conversation might have been deleted)
  useEffect(() => {
    if (selectedConversation && messages.length > 0 && (conversations as any[]).length > 0) {
      const conversationExists = (conversations as any[]).find((conv: any) => conv.userId === selectedConversation);
      if (!conversationExists) {
        // Conversation was deleted but we still have message history
        console.log('Conversation deleted but message history exists');
      }
    }
  }, [selectedConversation, messages, conversations]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    console.log('Attempting to send message to:', selectedConversation);
    console.log('Message content:', newMessage.trim());

    sendMessageMutation.mutate({
      receiverId: selectedConversation,
      content: newMessage.trim(),
    });
  };

  const handleStartConversation = (userId: number) => {
    if (!newMessage.trim()) return;

    startConversationMutation.mutate({
      userId,
      content: newMessage.trim(),
    });
  };



  const handleBlockUser = (userId: number) => {
    blockUserMutation.mutate(userId);
  };

  const handleUnblockUser = (userId: number) => {
    unblockUserMutation.mutate(userId);
  };




  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleDeleteConversation = (userId: number) => {
    deleteConversationMutation.mutate(userId);
  };

  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter((conv: any) => {
        const user = conv.user || {};
        const displayName = user.displayName || user.username || '';
        const username = user.username || '';
        return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               username.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to access messages</p>
        </div>
      </div>
    );
  }

  if (isNewConversationOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] bg-background">
        {/* New Conversation Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsNewConversationOpen(false);
                setUserSearchQuery("");
                setUserSearchResults([]);
                setNewMessage("");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">New Message</h1>
          </div>
        </div>

        {/* User Search */}
        <div className="p-4 border-b bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a user..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-hidden">
          {(userSearchQuery.startsWith('@') ? userSearchQuery.length > 2 : userSearchQuery.length > 1) ? (
            <ScrollArea className="h-full">
              <div className="p-4">
                {userSearchResults.length > 0 ? (
                  <div className="space-y-2">
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedConversation(user.id);
                          setSelectedUserInfo(user); // Store user info for header display
                          setIsNewConversationOpen(false);
                          setUserSearchQuery("");
                          setUserSearchResults([]);
                          setNewMessage(""); // Clear any existing message
                        }}
                      >
                        {user.nftProfileTokenId && user.nftProfileImageUrl ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                            <img src={user.nftProfileImageUrl} alt={user.displayName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <SignedAvatar url={user.avatarUrl} fallback={user.displayName.charAt(0).toUpperCase()} className="h-10 w-10" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No users found</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Search for users to start a conversation</p>
                <p className="text-sm text-muted-foreground">Type at least 3 characters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <VerificationGuard requireEmailVerification={true} requireOnboarding={false}>
      <div className="flex h-[calc(100vh-80px)] bg-background">
      {/* Conversations Sidebar */}
      <div className={`
        ${showMobileConversationList || !selectedConversation ? 'flex' : 'hidden'} 
        md:flex w-full md:w-[420px] border-r bg-card flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h1>
            <Button
              size="sm"
              onClick={() => setIsNewConversationOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full font-medium shadow-md hover:shadow-lg transition-all"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>

          {/* Search conversations */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loadingConversations ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/20 animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground">Start a new conversation</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conversation: any) => {
                  const convUser = conversation.user || {};
                  const displayName = convUser.displayName || convUser.username || 'Unknown User';
                  const avatarUrl = convUser.avatarUrl || '';
                  const useNftAvatar = convUser.activeProfilePicType === 'nft' && convUser.nftProfileImageUrl;

                  return (
                    <div
                      key={conversation.userId}
                      className={`relative group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === conversation.userId
                          ? "bg-green-600/10 border border-green-600/20"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => {
                          setSelectedConversation(conversation.userId);
                          setSelectedUserInfo(null); // Clear stored user info for existing conversations
                          setShowMobileConversationList(false); // Hide conversation list on mobile when chat is selected
                        }}
                      >
                        {useNftAvatar ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                            <img src={convUser.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-green-500' : ''}`}>{displayName}</p>
                            {conversation.lastMessage && conversation.lastMessage.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {(() => {
                                  try {
                                    return formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true });
                                  } catch {
                                    return 'Recently';
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate flex items-center gap-1 ${conversation.unreadCount > 0 ? 'text-white font-bold' : 'text-muted-foreground'}`}>
                            {conversation.lastMessage?.senderId === user?.id && (
                              <CornerDownRight className="h-3 w-3 flex-shrink-0 text-green-500" />
                            )}
                            <span className="truncate">{conversation.lastMessage?.content || "No messages yet"}</span>
                            {conversation.lastMessage?.senderId === user?.id && conversation.lastMessage?.isRead && (
                              <CheckCheck className="h-3 w-3 flex-shrink-0 text-blue-400" />
                            )}
                            {conversation.lastMessage?.senderId === user?.id && !conversation.lastMessage?.isRead && (
                              <Check className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            )}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="bg-green-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Delete Conversation Button */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white border-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete Conversation</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete your entire conversation history with {displayName}? This action cannot be undone and will permanently remove all messages between you and this user.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteConversation(conversation.userId)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={deleteConversationMutation.isPending}
                              >
                                {deleteConversationMutation.isPending ? "Deleting..." : "Delete Conversation"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`
        ${!showMobileConversationList && selectedConversation ? 'flex' : 'hidden'} 
        md:flex flex-1 flex-col
      `}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileConversationList(true)}
                  className="md:hidden"
                  data-testid="button-back-to-conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                {/* User Info */}
                <div className="flex-1">
                  {(() => {
                const conversation = Array.isArray(conversations)
                  ? conversations.find((c: any) => c.userId === selectedConversation)
                  : null;

                // If no conversation found but we have messages, get user info from latest message
                if (!conversation && messages.length > 0) {
                  const latestMessage = messages[messages.length - 1];
                  const otherUser = latestMessage.senderId === user.id ? latestMessage.receiver : latestMessage.sender;
                  if (otherUser) {
                    const displayName = otherUser.displayName || otherUser.username || 'Unknown User';
                    const username = otherUser.username || 'unknown';
                    const avatarUrl = otherUser.avatarUrl || '';

                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {username && username !== 'unknown' ? (
                            <Link href={`/profile/${username}`} data-testid="link-profile-avatar">
                              {otherUser.nftProfileTokenId && otherUser.nftProfileImageUrl ? (
                                <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40 cursor-pointer">
                                  <img src={otherUser.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10 cursor-pointer" />
                              )}
                            </Link>
                          ) : (
                            otherUser.nftProfileTokenId && otherUser.nftProfileImageUrl ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                                <img src={otherUser.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10" />
                            )
                          )}
                          <div>
                            <h2 className="font-semibold">{displayName}</h2>
                            <p className="text-sm text-muted-foreground">@{username}</p>
                            <p className="text-xs text-yellow-600">Conversation deleted - showing message history</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }

                // If no conversation but we have a selected user, use stored user info
                if (!conversation && selectedConversation && selectedUserInfo) {
                  const displayName = selectedUserInfo.displayName || selectedUserInfo.username || 'Unknown User';
                  const username = selectedUserInfo.username || 'unknown';
                  const avatarUrl = selectedUserInfo.avatarUrl || '';

                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {username && username !== 'unknown' ? (
                          <Link href={`/profile/${username}`} data-testid="link-profile-avatar">
                            {selectedUserInfo.nftProfileTokenId && selectedUserInfo.nftProfileImageUrl ? (
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40 cursor-pointer">
                                <img src={selectedUserInfo.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10 cursor-pointer" />
                            )}
                          </Link>
                        ) : (
                          selectedUserInfo.nftProfileTokenId && selectedUserInfo.nftProfileImageUrl ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                              <img src={selectedUserInfo.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10" />
                          )
                        )}
                        <div>
                          <h2 className="font-semibold">{displayName}</h2>
                          <p className="text-sm text-muted-foreground">@{username}</p>
                          <p className="text-xs text-green-600">Starting new conversation</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          const isBlocked = Array.isArray(blockedUsers) && blockedUsers.some((blocked: any) =>
                            blocked.id === selectedConversation || blocked.userId === selectedConversation
                          );

                          console.log(`Main view - User ${selectedConversation} blocked status:`, isBlocked);

                          if (isBlocked) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                                  <Shield className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-700 dark:text-red-400">User Blocked</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20"
                                  onClick={() => handleUnblockUser(selectedConversation)}
                                  disabled={unblockUserMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  {unblockUserMutation.isPending ? "Unblocking..." : "Unblock"}
                                </Button>
                              </div>
                            );
                          } else {
                            return (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Block
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-navy border-navy-light">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Block User</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                      Are you sure you want to block @{selectedUserInfo.username}?
                                      This will prevent them from sending you messages and you won't be able to send them messages either.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-navy-light border-navy-light hover:bg-navy-light/80">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleBlockUser(selectedConversation)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={blockUserMutation.isPending}
                                    >
                                      {blockUserMutation.isPending ? "Blocking..." : "Block User"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  );
                }

                if (!conversation) return null;

                const conversationUser = conversation.user || {};
                const displayName = conversationUser.displayName || conversationUser.username || 'Unknown User';
                const username = conversationUser.username || 'unknown';
                const avatarUrl = conversationUser.avatarUrl || '';
                const useNftAvatar = conversationUser.activeProfilePicType === 'nft' && conversationUser.nftProfileImageUrl;

                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {username && username !== 'unknown' ? (
                        <Link href={`/profile/${username}`} data-testid="link-profile-avatar">
                          {useNftAvatar ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40 cursor-pointer">
                              <img src={conversationUser.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10 cursor-pointer" />
                          )}
                        </Link>
                      ) : (
                        useNftAvatar ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                            <img src={conversationUser.nftProfileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <SignedAvatar url={avatarUrl} fallback={displayName.charAt(0).toUpperCase()} className="h-10 w-10" />
                        )
                      )}
                      <div>
                        <h2 className="font-semibold">{displayName}</h2>
                        <p className="text-sm text-muted-foreground">@{username}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const isBlocked = Array.isArray(blockedUsers) && blockedUsers.some((blocked: any) =>
                          blocked.id === conversation.userId || blocked.userId === conversation.userId
                        );

                        console.log(`User ${conversation.userId} blocked status:`, isBlocked, "Blocked users:", blockedUsers);

                        if (isBlocked) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                                <Shield className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">User Blocked</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20"
                                onClick={() => handleUnblockUser(conversation.userId)}
                                disabled={unblockUserMutation.isPending}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {unblockUserMutation.isPending ? "Unblocking..." : "Unblock"}
                              </Button>
                            </div>
                          );
                        } else {
                          return (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Block
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-navy border-navy-light">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Block User</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    Are you sure you want to block @{conversation.user.username}?
                                    This will prevent them from sending you messages and you won't be able to send them messages either.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-navy-light border-navy-light hover:bg-navy-light/80">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleBlockUser(conversation.userId)}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={blockUserMutation.isPending}
                                  >
                                    {blockUserMutation.isPending ? "Blocking..." : "Block User"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          );
                        }
                      })()}
                    </div>
                  </div>
                );
              })()}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4 pr-5">
              {loadingMessages ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-xs">
                        <div className="h-8 bg-muted animate-pulse rounded-lg mb-1" />
                        <div className="h-3 bg-muted-foreground/20 animate-pulse rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(messages) && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>No messages yet</p>
                    <p className="text-sm">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(messages) && messages.map((message: any) => {
                    const isMine = message.senderId === user.id;
                    const senderUser = message.sender;
                    const useNftInBubble = senderUser?.activeProfilePicType === 'nft' && senderUser?.nftProfileImageUrl;
                    const avatarSrc = useNftInBubble
                      ? senderUser.nftProfileImageUrl
                      : senderUser?.avatarUrl || '';
                    const senderInitial = (senderUser?.displayName || senderUser?.username || '?')[0]?.toUpperCase();

                    return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for received messages (left side) */}
                      {!isMine && (
                        <div className="flex-shrink-0">
                          {useNftInBubble ? (
                            <div className="h-7 w-7 rounded-md overflow-hidden border border-[#4ade80]/40">
                              <img src={senderUser.nftProfileImageUrl} alt={senderUser.displayName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <SignedAvatar url={avatarSrc} fallback={senderInitial} className="h-7 w-7" />
                          )}
                        </div>
                      )}

                      <div className={`max-w-xs lg:max-w-md`}>
                        <div
                          className={`rounded-lg px-4 py-2 relative group ${
                            isMine
                              ? "bg-green-600 text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {message.senderId === user.id && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white border-none"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-gray-900 border-gray-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Delete Message</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                      Are you sure you want to delete this message? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      disabled={deleteMessageMutation.isPending}
                                    >
                                      {deleteMessageMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                          message.senderId === user.id ? "justify-end" : "justify-start"
                        }`}>
                          <span>
                            {(() => {
                              try {
                                return message.createdAt
                                  ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
                                  : 'Just now';
                              } catch {
                                return 'Just now';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ); })}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="px-4 py-3 border-t bg-card">
              <form
                onSubmit={handleSendMessage}
              >
                <div className="flex gap-2">
                  {(() => {
                    const isBlocked = blockedUsers.some(
                      (blockedUser: any) => blockedUser.id === selectedConversation || blockedUser.userId === selectedConversation
                    );

                    if (isBlocked) {
                      return (
                        <div className="flex-1 text-center p-4 text-gray-500">
                          <Shield className="h-6 w-6 mx-auto mb-2" />
                          <p>Cannot send messages to blocked user</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1"
                          disabled={sendMessageMutation.isPending}
                        />
                        <Button
                          type="submit"
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white px-4"
                        >
                          {sendMessageMutation.isPending ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </VerificationGuard>
  );
};

export default MessagesPage;