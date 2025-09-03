import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommentWithUser, User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "date-fns";
import { useCreateComment, useDeleteComment } from "@/hooks/use-clips";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Trash2 } from "lucide-react";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useJoinDialog } from "@/hooks/use-join-dialog";
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

interface CommentSectionProps {
  clipId: number;
  currentUserId?: number | null;
  onUsernameClick?: () => void; // Function to close parent dialog
  highlightCommentId?: number | null; // Comment ID to highlight
}

const CommentSection = ({ clipId, currentUserId = 1, onUsernameClick, highlightCommentId }: CommentSectionProps) => {
  const [newComment, setNewComment] = useState("");
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  
  const { data: comments, isLoading } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clipId}/comments`],
  });
  
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  // Use the authenticated user data
  const currentUser = user;

  // Scroll to highlighted comment after comments are loaded
  useEffect(() => {
    if (highlightCommentId && comments && comments.length > 0) {
      const timer = setTimeout(() => {
        const commentElement = document.getElementById(`comment-${highlightCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200); // Small delay to ensure DOM is updated
      return () => clearTimeout(timer);
    }
  }, [highlightCommentId, comments]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    if (!user) {
      openDialog('comment');
      return;
    }

    // Check email verification (except for demo user)
    if (!user.emailVerified && user.username !== "demo") {
      toast({
        title: "Email verification required",
        description: "Please verify your email address to comment. Check your inbox for a verification link.",
        variant: "destructive",
      });
      return;
    }
    
    createCommentMutation.mutate({
      clipId,
      text: newComment
    }, {
      onSuccess: () => {
        setNewComment("");
      }
    });
  };

  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate({
      commentId,
      clipId
    });
    setCommentToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="ml-2 h-4 w-32" />
        </div>
        <Skeleton className="h-20 w-full mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Comments list */}
      <div className="space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              id={`comment-${comment.id}`}
              className={`flex space-x-3 text-sm transition-all duration-500 ${
                highlightCommentId === comment.id 
                  ? 'rounded-lg p-3 -mx-3 shadow-lg' 
                  : ''
              }`}
              style={{
                backgroundColor: highlightCommentId === comment.id ? '#fef3c7' : 'transparent',
                border: highlightCommentId === comment.id ? '3px solid #f59e0b' : 'none',
                animation: highlightCommentId === comment.id ? 'pulse 1s ease-in-out infinite' : 'none'
              }}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage 
                  src={comment.user.avatarUrl || undefined} 
                  alt={comment.user.username || "User"} 
                />
                <AvatarFallback className="text-xs">
                  {comment.user.username?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline">
                  <Link href={`/profile/${comment.user.username}`}>
                    <span 
                      className="font-semibold mr-2 text-sm hover:text-primary cursor-pointer"
                      onClick={onUsernameClick}
                    >
                      {comment.user.username}
                    </span>
                  </Link>
                  <p className="inline text-sm break-words">{comment.content}</p>
                </div>
                <div className="flex items-center mt-1.5 space-x-3 text-xs text-muted-foreground">
                  <span>
                    {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                  </span>
                  {comment.userId === user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-xs font-medium hover:text-destructive">
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this comment? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteComment(comment.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
      
      {/* Comment form - only show to authenticated users */}
      {user ? (
        <form 
          onSubmit={handleSubmitComment} 
          className="mt-4 flex items-center gap-3"
        >
          <Avatar className="h-8 w-8 hidden sm:flex flex-shrink-0">
            <AvatarImage 
              src={currentUser?.avatarUrl || undefined} 
              alt={currentUser?.username || "User"} 
            />
            <AvatarFallback className="text-xs">
              {currentUser?.username?.[0].toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center border-b border-border pb-1">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment(e);
                }
              }}
              className="flex-1 bg-transparent text-sm border-none focus:outline-none focus:ring-0 p-0"
              data-testid="input-comment"
            />
            <Button 
              type="submit" 
              variant="ghost"
              size="sm"
              className="text-primary font-semibold hover:text-primary/80 hover:bg-transparent focus:bg-transparent px-2"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              data-testid="button-post-comment"
            >
              {createCommentMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex items-center justify-center">
          <Button 
            variant="outline"
            onClick={() => openDialog('comment')}
            className="w-full"
            data-testid="button-join-to-comment"
          >
            Sign in to add a comment
          </Button>
        </div>
      )}
      
      <JoinGamefolioDialog 
        open={isOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
    </div>
  );
};

export default CommentSection;
