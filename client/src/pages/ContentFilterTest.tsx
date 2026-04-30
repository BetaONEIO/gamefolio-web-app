import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, TestTube2 } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  errors?: string[];
}

export default function ContentFilterTest() {
  const { toast } = useToast();
  
  const [testData, setTestData] = useState({
    comment: '',
    message: '',
    clipTitle: '',
    clipDescription: '',
    bio: '',
    displayName: '',
    username: '',
    email: ''
  });

  const [results, setResults] = useState<Record<string, TestResult>>({
    username: undefined,
    registration: undefined
  });

  // Test comment mutation
  const testCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/clips/1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResults(prev => ({ ...prev, comment: { success: true, message: 'Comment passed all filters' } }));
      toast({ title: 'Success', description: 'Comment was accepted' });
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message);
        setResults(prev => ({ 
          ...prev, 
          comment: { 
            success: false, 
            message: errorData.message || 'Comment was blocked',
            errors: errorData.errors 
          } 
        }));
        toast({ title: 'Blocked', description: 'Comment contains inappropriate content', variant: 'destructive' });
      } catch {
        setResults(prev => ({ ...prev, comment: { success: false, message: 'Network error' } }));
        toast({ title: 'Error', description: 'Network error occurred', variant: 'destructive' });
      }
    },
  });

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, recipientId: 1 }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResults(prev => ({ ...prev, message: { success: true, message: 'Message passed all filters' } }));
      toast({ title: 'Success', description: 'Message was accepted' });
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message);
        setResults(prev => ({ 
          ...prev, 
          message: { 
            success: false, 
            message: errorData.message || 'Message was blocked',
            errors: errorData.errors 
          } 
        }));
        toast({ title: 'Blocked', description: 'Message contains inappropriate content', variant: 'destructive' });
      } catch {
        setResults(prev => ({ ...prev, message: { success: false, message: 'Network error' } }));
        toast({ title: 'Error', description: 'Network error occurred', variant: 'destructive' });
      }
    },
  });

  // Test profile update mutation
  const testProfileMutation = useMutation({
    mutationFn: async (profileData: { bio?: string; displayName?: string }) => {
      const response = await fetch('/api/users/999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResults(prev => ({ ...prev, profile: { success: true, message: 'Profile update passed all filters' } }));
      toast({ title: 'Success', description: 'Profile was updated' });
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message);
        setResults(prev => ({ 
          ...prev, 
          profile: { 
            success: false, 
            message: errorData.message || 'Profile update was blocked',
            errors: errorData.errors 
          } 
        }));
        toast({ title: 'Blocked', description: 'Profile contains inappropriate content', variant: 'destructive' });
      } catch {
        setResults(prev => ({ ...prev, profile: { success: false, message: 'Network error' } }));
        toast({ title: 'Error', description: 'Network error occurred', variant: 'destructive' });
      }
    },
  });

  // Test username availability mutation
  const testUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResults(prev => ({ ...prev, username: { success: true, message: 'Username is available and passed filters' } }));
      toast({ title: 'Success', description: 'Username is available' });
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message);
        setResults(prev => ({ 
          ...prev, 
          username: { 
            success: false, 
            message: errorData.message || 'Username was blocked',
            errors: errorData.errors 
          } 
        }));
        toast({ title: 'Blocked', description: 'Username contains inappropriate content', variant: 'destructive' });
      } catch {
        setResults(prev => ({ ...prev, username: { success: false, message: 'Network error' } }));
        toast({ title: 'Error', description: 'Network error occurred', variant: 'destructive' });
      }
    },
  });

  // Test registration mutation
  const testRegistrationMutation = useMutation({
    mutationFn: async (registrationData: { username: string; email: string; displayName?: string }) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          password: 'TestPassword123!',
          displayName: registrationData.displayName || registrationData.username
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResults(prev => ({ ...prev, registration: { success: true, message: 'Registration passed all filters' } }));
      toast({ title: 'Success', description: 'Registration data is valid' });
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message);
        setResults(prev => ({ 
          ...prev, 
          registration: { 
            success: false, 
            message: errorData.message || 'Registration was blocked',
            errors: errorData.errors 
          } 
        }));
        toast({ title: 'Blocked', description: 'Registration data contains inappropriate content', variant: 'destructive' });
      } catch {
        setResults(prev => ({ ...prev, registration: { success: false, message: 'Network error' } }));
        toast({ title: 'Error', description: 'Network error occurred', variant: 'destructive' });
      }
    },
  });

  const getResultIcon = (success: boolean) => {
    return success ? (
      <Shield className="h-4 w-4 text-primary" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  const getResultBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-primary text-primary">Passed</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Blocked</Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Filter Testing</h1>
          <p className="text-gray-600 mt-1">Test the content filtering system across different endpoints</p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <TestTube2 className="h-4 w-4 mr-1" />
          Testing Panel
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Username Availability Test
              {results.username && getResultIcon(results.username.success)}
            </CardTitle>
            <CardDescription>
              Test content filtering on username validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-username">Username</Label>
              <Input
                id="test-username"
                value={testData.username}
                onChange={(e) => setTestData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username to test... Try 'baduser', 'damn_user', etc."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => testUsernameMutation.mutate(testData.username)}
                disabled={!testData.username.trim() || testUsernameMutation.isPending}
              >
                {testUsernameMutation.isPending ? 'Testing...' : 'Test Username'}
              </Button>
              {results.username && getResultBadge(results.username.success)}
            </div>

            {results.username && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <p className={results.username.success ? 'text-primary' : 'text-red-600'}>
                  {results.username.message}
                </p>
                {results.username.errors && (
                  <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                    {results.username.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Registration Filtering Test
              {results.registration && getResultIcon(results.registration.success)}
            </CardTitle>
            <CardDescription>
              Test content filtering on user registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-reg-username">Username</Label>
                <Input
                  id="test-reg-username"
                  value={testData.username}
                  onChange={(e) => setTestData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username..."
                />
              </div>
              <div>
                <Label htmlFor="test-reg-email">Email</Label>
                <Input
                  id="test-reg-email"
                  type="email"
                  value={testData.email}
                  onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email (try baduser@test.com)..."
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => testRegistrationMutation.mutate({
                  username: testData.username,
                  email: testData.email,
                  displayName: testData.displayName
                })}
                disabled={(!testData.username.trim() || !testData.email.trim()) || testRegistrationMutation.isPending}
              >
                {testRegistrationMutation.isPending ? 'Testing...' : 'Test Registration'}
              </Button>
              {results.registration && getResultBadge(results.registration.success)}
            </div>

            {results.registration && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <p className={results.registration.success ? 'text-primary' : 'text-red-600'}>
                  {results.registration.message}
                </p>
                {results.registration.errors && (
                  <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                    {results.registration.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Comment Filtering Test
              {results.comment && getResultIcon(results.comment.success)}
            </CardTitle>
            <CardDescription>
              Test content filtering on the comments endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-comment">Comment Content</Label>
              <Textarea
                id="test-comment"
                value={testData.comment}
                onChange={(e) => setTestData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Enter comment to test... Try words like 'damn', 'stupid', or profanity"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => testCommentMutation.mutate(testData.comment)}
                disabled={!testData.comment.trim() || testCommentMutation.isPending}
              >
                {testCommentMutation.isPending ? 'Testing...' : 'Test Comment'}
              </Button>
              {results.comment && getResultBadge(results.comment.success)}
            </div>

            {results.comment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <p className={results.comment.success ? 'text-primary' : 'text-red-600'}>
                  {results.comment.message}
                </p>
                {results.comment.errors && (
                  <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                    {results.comment.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Message Filtering Test
              {results.message && getResultIcon(results.message.success)}
            </CardTitle>
            <CardDescription>
              Test content filtering on the messages endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-message">Message Content</Label>
              <Textarea
                id="test-message"
                value={testData.message}
                onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter message to test..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => testMessageMutation.mutate(testData.message)}
                disabled={!testData.message.trim() || testMessageMutation.isPending}
              >
                {testMessageMutation.isPending ? 'Testing...' : 'Test Message'}
              </Button>
              {results.message && getResultBadge(results.message.success)}
            </div>

            {results.message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <p className={results.message.success ? 'text-primary' : 'text-red-600'}>
                  {results.message.message}
                </p>
                {results.message.errors && (
                  <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                    {results.message.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Profile Update Filtering Test
              {results.profile && getResultIcon(results.profile.success)}
            </CardTitle>
            <CardDescription>
              Test content filtering on profile update endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-display-name">Display Name</Label>
                <Input
                  id="test-display-name"
                  value={testData.displayName}
                  onChange={(e) => setTestData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Enter display name to test..."
                />
              </div>
              <div>
                <Label htmlFor="test-bio">Bio</Label>
                <Textarea
                  id="test-bio"
                  value={testData.bio}
                  onChange={(e) => setTestData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Enter bio to test..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => testProfileMutation.mutate({
                  ...(testData.displayName && { displayName: testData.displayName }),
                  ...(testData.bio && { bio: testData.bio })
                })}
                disabled={(!testData.displayName.trim() && !testData.bio.trim()) || testProfileMutation.isPending}
              >
                {testProfileMutation.isPending ? 'Testing...' : 'Test Profile Update'}
              </Button>
              {results.profile && getResultBadge(results.profile.success)}
            </div>

            {results.profile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <p className={results.profile.success ? 'text-primary' : 'text-red-600'}>
                  {results.profile.message}
                </p>
                {results.profile.errors && (
                  <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                    {results.profile.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Test Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>Test with these examples:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Basic profanity:</strong> "damn", "hell", "shit"</li>
                <li><strong>Inappropriate words:</strong> "stupid", "idiot", "hate"</li>
                <li><strong>Spam-like content:</strong> "CLICK HERE NOW!!!", "FREE MONEY"</li>
                <li><strong>Valid content:</strong> "This is awesome!", "Great gameplay"</li>
                <li><strong>Mixed content:</strong> "This is damn good content"</li>
                <li><strong>Username tests:</strong> "baduser", "damn_user", "sh*tgamer", "normaluser123"</li>
                <li><strong>Email tests:</strong> "baduser@test.com", "damn@email.com", "normal@user.com"</li>
              </ul>
              <p className="mt-3"><strong>Note:</strong> Registration tests use a dummy password and won't actually create accounts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}