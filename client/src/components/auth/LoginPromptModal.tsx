import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn, X } from "lucide-react";
import { useLocation } from "wouter";

interface LoginPromptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionType?: "like" | "follow" | "message" | "comment" | "fire" | "interact";
  title?: string;
  description?: string;
}

export function LoginPromptModal({ 
  isOpen, 
  onOpenChange, 
  actionType = "interact",
  title,
  description 
}: LoginPromptModalProps) {
  const [, setLocation] = useLocation();

  const actionMessages = {
    like: {
      title: "Like this content",
      description: "Join Gamefolio to like and interact with amazing gaming content."
    },
    follow: {
      title: "Follow this gamer",
      description: "Create an account to follow your favorite gamers and never miss their content."
    },
    message: {
      title: "Send a message",
      description: "Sign up to connect with other gamers in the community."
    },
    comment: {
      title: "Join the conversation",
      description: "Register to comment and share your thoughts with the gaming community."
    },
    fire: {
      title: "Show your appreciation",
      description: "Join Gamefolio to fire up content and support creators."
    },
    interact: {
      title: "Join the community",
      description: "Create an account to interact with content and connect with other gamers."
    }
  };

  const currentMessage = actionMessages[actionType];

  const handleLogin = () => {
    setLocation("/auth");
    onOpenChange(false);
  };

  const handleRegister = () => {
    setLocation("/auth?mode=register");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-login-prompt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-modal-title">
            <UserPlus className="h-5 w-5 text-primary" />
            {title || currentMessage.title}
          </DialogTitle>
          <DialogDescription data-testid="text-modal-description">
            {description || currentMessage.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleRegister} 
            className="w-full" 
            size="lg"
            data-testid="button-register"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
          
          <Button 
            onClick={handleLogin} 
            variant="outline" 
            className="w-full" 
            size="lg"
            data-testid="button-login"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Button>
        </div>
        
        {/* Enhanced Close Button - More Visible */}
        <button
          onClick={() => onOpenChange(false)}
          data-testid="button-close-modal"
          className="absolute top-3 right-3 z-50 bg-gray-700 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-110 opacity-100"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Additional Cancel Button at Bottom */}
        <div className="mt-6 text-center">
          <button
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-modal"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}