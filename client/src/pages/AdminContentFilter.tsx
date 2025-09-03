import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, TestTube2, Shield, AlertTriangle, Database, Settings } from 'lucide-react';

interface BannedWord {
  id: number;
  word: string;
  isActive: boolean;
  addedBy: number;
  reason?: string;
  addedAt: string;
  updatedAt: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  originalText: string;
  cleanedText?: string;
}

export default function AdminContentFilter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form states
  const [newWord, setNewWord] = useState('');
  const [newWordReason, setNewWordReason] = useState('');
  
  // Test content states
  const [testContent, setTestContent] = useState({
    comment: '',
    message: '',
    bio: '',
    displayName: '',
    title: '',
    description: ''
  });
  
  const [testResults, setTestResults] = useState<Record<string, ValidationResult>>({});

  // Fetch banned words
  const { data: bannedWords = [], isLoading: wordsLoading } = useQuery<BannedWord[]>({
    queryKey: ['/api/admin/content-filter/banned-words'],
  });

  // Add banned word mutation
  const addWordMutation = useMutation({
    mutationFn: async (wordData: { word: string; reason?: string }) => {
      const response = await fetch('/api/admin/content-filter/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add word');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-filter/banned-words'] });
      setNewWord('');
      setNewWordReason('');
      toast({ title: 'Success', description: 'Banned word added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to add banned word', variant: 'destructive' });
    },
  });

  // Delete banned word mutation
  const deleteWordMutation = useMutation({
    mutationFn: async (word: string) => {
      const response = await fetch(`/api/admin/content-filter/banned-words/${encodeURIComponent(word)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete word');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-filter/banned-words'] });
      toast({ title: 'Success', description: 'Banned word deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete banned word', variant: 'destructive' });
    },
  });

  // Test content validation
  const testValidation = async (fieldType: string, content: string) => {
    try {
      const response = await fetch(`/api/admin/content-filter/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fieldType }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          isValid: false,
          errors: errorData.errors || ['Validation failed'],
          originalText: content
        };
      }
      
      const result = await response.json();
      return {
        isValid: result.isValid,
        errors: result.errors || [],
        originalText: content,
        cleanedText: result.cleanedContent
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Network error occurred'],
        originalText: content
      };
    }
  };

  const handleTestContent = async (fieldType: string) => {
    const content = testContent[fieldType as keyof typeof testContent];
    if (!content.trim()) {
      toast({ title: 'Warning', description: 'Please enter content to test' });
      return;
    }

    const result = await testValidation(fieldType, content);
    setTestResults(prev => ({ ...prev, [fieldType]: result }));
  };

  const handleTestAllContent = async () => {
    const results: Record<string, ValidationResult> = {};
    
    for (const [fieldType, content] of Object.entries(testContent)) {
      if (content.trim()) {
        results[fieldType] = await testValidation(fieldType, content);
      }
    }
    
    setTestResults(results);
    toast({ title: 'Testing Complete', description: 'All content has been validated' });
  };

  const getResultIcon = (isValid: boolean) => {
    return isValid ? (
      <Shield className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  if (wordsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading content filter administration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Filter Administration</h1>
          <p className="text-gray-600 mt-1">Manage banned words and test content validation</p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Admin Panel
        </Badge>
      </div>

      <Tabs defaultValue="banned-words" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="banned-words">Banned Words</TabsTrigger>
          <TabsTrigger value="content-testing">Content Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="banned-words" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Banned Word
              </CardTitle>
              <CardDescription>
                Add new words to the content filter system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="new-word">Word or Phrase</Label>
                  <Input
                    id="new-word"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Enter word to ban..."
                  />
                </div>
                <div>
                  <Label htmlFor="word-reason">Reason (Optional)</Label>
                  <Input
                    id="word-reason"
                    value={newWordReason}
                    onChange={(e) => setNewWordReason(e.target.value)}
                    placeholder="Why is this word banned?"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    if (!newWord.trim()) {
                      toast({ title: 'Error', description: 'Please enter a word to ban', variant: 'destructive' });
                      return;
                    }
                    addWordMutation.mutate({ 
                      word: newWord.trim(), 
                      reason: newWordReason.trim() || undefined 
                    });
                  }}
                  disabled={addWordMutation.isPending}
                >
                  {addWordMutation.isPending ? 'Adding...' : 'Add Word'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Banned Words ({bannedWords.length})
              </CardTitle>
              <CardDescription>
                Words stored in the database and used for content filtering
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bannedWords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No banned words in database. Add some above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {bannedWords.map((word) => (
                    <div key={word.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={word.isActive ? "destructive" : "secondary"}>
                          {word.word}
                        </Badge>
                        {word.reason && (
                          <span className="text-sm text-gray-600">
                            {word.reason}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {word.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteWordMutation.mutate(word.word)}
                          disabled={deleteWordMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                Content Testing Interface
              </CardTitle>
              <CardDescription>
                Test content against the current filter settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(testContent).map(([fieldType, content]) => (
                  <div key={fieldType} className="space-y-2">
                    <Label htmlFor={`test-${fieldType}`}>
                      Test {fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}
                    </Label>
                    <div className="flex gap-2">
                      <Textarea
                        id={`test-${fieldType}`}
                        value={content}
                        onChange={(e) => setTestContent(prev => ({ 
                          ...prev, 
                          [fieldType]: e.target.value 
                        }))}
                        placeholder={`Enter ${fieldType} content to test...`}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleTestContent(fieldType)}
                        disabled={!content.trim()}
                        size="sm"
                      >
                        Test
                      </Button>
                    </div>
                    
                    {testResults[fieldType] && (
                      <div className={`p-3 rounded-lg ${
                        testResults[fieldType].isValid 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getResultIcon(testResults[fieldType].isValid)}
                          <span className={`font-medium ${
                            testResults[fieldType].isValid ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {testResults[fieldType].isValid ? 'Content Approved' : 'Content Blocked'}
                          </span>
                        </div>
                        
                        {!testResults[fieldType].isValid && testResults[fieldType].errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-red-700">Issues found:</p>
                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                              {testResults[fieldType].errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {testResults[fieldType].cleanedText && testResults[fieldType].cleanedText !== testResults[fieldType].originalText && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-blue-700">Cleaned version:</p>
                            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded mt-1">
                              {testResults[fieldType].cleanedText}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Button onClick={handleTestAllContent} className="w-full">
                    Test All Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}