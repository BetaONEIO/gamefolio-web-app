import { useState } from "react";
import { CommentWithUser } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "date-fns";
import { useScreenshotComments, useCreateScreenshotComment, useDeleteScreenshotComment } from "@/hooks/use-clips";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Send } from "lucide-react";
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

interface ScreenshotCommentSectionProps {
  screenshotId: number;
}

export function ScreenshotCommentSection({ screenshotId }: ScreenshotCommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: comments, isLoading } = useScreenshotComments(screenshotId);
  const createCommentMutation = useCreateScreenshotComment();
  const deleteCommentMutation = useDeleteScreenshotComment();

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to comment",
        variant: "default"
      });
      return;
    }

    if (!user.emailVerified && user.username !== "demo") {
      toast({
        title: "Email verification required",
        description: "Please verify your email address to comment. Check your inbox for a verification link.",
        variant: "destructive",
      });
      return;
    }
    
    createCommentMutation.mutate({
      screenshotId,
      text: newComment
    }, {
      onSuccess: () => {
        setNewComment("");
        toast({
          title: "Comment posted",
          description: "Your comment has been added successfully.",
          variant: "default",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to post comment",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate({
      commentId,
      screenshotId
    }, {
      onSuccess: () => {
        toast({
          title: "Comment deleted",
          description: "Your comment has been removed.",
          variant: "default",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="ml-2 h-4 w-32" />
        </div>
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
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Comments ({comments?.length || 0})</h4>
      
      {/* Comments list */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 text-sm">
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
                  <Link href={`/@${comment.user.username}`}>
                    <span className="font-semibold mr-2 text-sm hover:text-primary cursor-pointer">
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
      
      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 hidden sm:flex flex-shrink-0">
              <AvatarImage 
                src={user?.avatarUrl || undefined} 
                alt={user?.username || "User"} 
              />
              <AvatarFallback className="text-xs">
                {user?.username?.[0].toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment... Use @username to mention other users!"
                className="min-h-[60px] resize-none text-sm"
                data-testid="input-comment"
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  variant="default"
                  size="sm"
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  data-testid="button-post-comment"
                >
                  {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 border-t">
          <p className="text-sm text-muted-foreground">Log in to comment</p>
        </div>
      )}
    </div>
  );
}
