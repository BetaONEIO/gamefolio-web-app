import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePictureSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  onAvatarSelect: (avatarUrl: string) => void;
}

const predefinedAvatars = [
  {
    id: 'mac',
    name: 'Gaming Cat',
    url: '/attached_assets/Mac_1756128079346.png',
    category: 'Characters'
  },
  {
    id: 'anyt',
    name: 'Cute Ant',
    url: '/attached_assets/Anyt_1756128079347.png',
    category: 'Characters'
  },
  {
    id: 'hogs-of-war',
    name: 'War Pig',
    url: '/attached_assets/Hogs of war_1756128079348.png',
    category: 'Characters'
  },
  {
    id: 'meka',
    name: 'Cyber Ninja',
    url: '/attached_assets/Meka_1756128079348.png',
    category: 'Characters'
  },
  {
    id: 'ts1',
    name: 'Action Hero',
    url: '/attached_assets/Ts1_1756128079349.png',
    category: 'Characters'
  },
  {
    id: 'soldier',
    name: 'Tactical Soldier',
    url: '/attached_assets/Soldier_1756128079350.png',
    category: 'Characters'
  },
  {
    id: 'dragon',
    name: 'Fierce Dragon',
    url: '/attached_assets/Dragon_1756128079350.png',
    category: 'Fantasy'
  },
  {
    id: 'tie-dye',
    name: 'Tie Dye',
    url: '/attached_assets/Tie dye_1756128079351.png',
    category: 'Abstract'
  },
  {
    id: 'orange-gradient',
    name: 'Orange Gradient',
    url: '/attached_assets/Orange gradient_1756128079352.png',
    category: 'Abstract'
  },
  {
    id: 'gradient',
    name: 'Blue Gradient',
    url: '/attached_assets/Gradient_1756128079353.png',
    category: 'Abstract'
  }
];

export function ProfilePictureSelector({
  isOpen,
  onClose,
  currentAvatarUrl,
  onAvatarSelect
}: ProfilePictureSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatarUrl || '');

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
  };

  const handleConfirmSelection = () => {
    if (selectedAvatar) {
      onAvatarSelect(selectedAvatar);
      onClose();
    }
  };

  const categories = Array.from(new Set(predefinedAvatars.map(avatar => avatar.category)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-avatar-selector">
        <DialogHeader>
          <DialogTitle>Select Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryAvatars = predefinedAvatars.filter(avatar => avatar.category === category);
            
            return (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">{category}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categoryAvatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className={cn(
                        "relative cursor-pointer group transition-all duration-200",
                        "hover:scale-105 hover:shadow-lg"
                      )}
                      onClick={() => handleAvatarSelect(avatar.url)}
                      data-testid={`avatar-option-${avatar.id}`}
                    >
                      <div
                        className={cn(
                          "relative rounded-lg border-2 transition-all duration-200",
                          selectedAvatar === avatar.url
                            ? "border-primary ring-2 ring-primary/20 shadow-lg"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Avatar className="h-20 w-20 rounded-lg">
                          <AvatarImage 
                            src={avatar.url} 
                            alt={avatar.name}
                            className="rounded-lg object-cover"
                          />
                          <AvatarFallback className="rounded-lg">
                            {avatar.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Selection indicator */}
                        {selectedAvatar === avatar.url && (
                          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-center mt-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {avatar.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-avatar"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectedAvatar}
            data-testid="button-confirm-avatar"
          >
            Select Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}