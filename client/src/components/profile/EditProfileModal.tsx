import React, { useState } from 'react';
import { UserWithStats } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { useUpdateProfile } from '@/hooks/use-profile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FaSteam, FaXbox, FaPlaystation, FaTwitter, FaYoutube } from 'react-icons/fa';

interface EditProfileModalProps {
  profile: UserWithStats;
  trigger?: React.ReactNode;
}

type FormValues = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  steamUsername: string;
  xboxUsername: string;
  playstationUsername: string;
  twitterUsername: string;
  youtubeUsername: string;
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const updateProfile = useUpdateProfile();
  
  const form = useForm<FormValues>({
    defaultValues: {
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      bannerUrl: profile.bannerUrl || '',
      steamUsername: profile.steamUsername || '',
      xboxUsername: profile.xboxUsername || '',
      playstationUsername: profile.playstationUsername || '',
      twitterUsername: profile.twitterUsername || '',
      youtubeUsername: profile.youtubeUsername || '',
    }
  });
  
  const onSubmit = async (values: FormValues) => {
    await updateProfile.mutateAsync({
      userId: profile.id,
      userData: values
    });
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Edit Profile</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and connect your gaming accounts.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="platforms">Platform Connections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself" 
                          {...field} 
                          className="h-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter a URL to your profile picture
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bannerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter a URL to your profile banner image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="platforms" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  <h3 className="text-lg font-medium">Gaming Platforms</h3>
                  
                  <FormField
                    control={form.control}
                    name="steamUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FaSteam className="text-[#1B2838] dark:text-[#66c0f4]" /> Steam
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="YourSteamUsername" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Steam profile username
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="xboxUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FaXbox className="text-[#107C10]" /> Xbox
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="YourXboxGamerTag" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Xbox gamertag
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="playstationUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FaPlaystation className="text-[#003791]" /> PlayStation
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="YourPSNUsername" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your PlayStation Network username
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <h3 className="text-lg font-medium mt-4">Social Media</h3>
                  
                  <FormField
                    control={form.control}
                    name="twitterUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FaTwitter className="text-[#1DA1F2]" /> X
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your X username (without @)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="youtubeUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FaYoutube className="text-[#FF0000]" /> YouTube
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your YouTube handle (without @)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;