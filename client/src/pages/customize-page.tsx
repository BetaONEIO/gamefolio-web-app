import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { HexColorPicker } from "react-colorful";
import { Palette, Eye, RotateCcw } from "lucide-react";

const DEFAULT_COLORS = {
  accentColor: "#4C8",
  primaryColor: "#02172C", 
  backgroundColor: "#0B2232",
  cardColor: "#1E3A8A"
};

const PRESET_THEMES = [
  {
    name: "Default",
    accentColor: "#4C8",
    backgroundColor: "#0B2232",
    cardColor: "#1E3A8A"
  },
  {
    name: "Ocean Blue",
    accentColor: "#00D4FF",
    backgroundColor: "#001122",
    cardColor: "#003366"
  },
  {
    name: "Purple Gaming",
    accentColor: "#9B59B6",
    backgroundColor: "#2C3E50",
    cardColor: "#34495E"
  },
  {
    name: "Neon Green",
    accentColor: "#39FF14",
    backgroundColor: "#0D1B2A",
    cardColor: "#1B263B"
  },
  {
    name: "Sunset Orange",
    accentColor: "#FF6B35",
    backgroundColor: "#1A1A2E",
    cardColor: "#16213E"
  },
  {
    name: "Pink Gamer",
    accentColor: "#FF69B4",
    backgroundColor: "#1E1E2E",
    cardColor: "#2D2D44"
  },
  {
    name: "Blocks",
    accentColor: "#4ade80",
    backgroundColor: "#1a1a1a",
    cardColor: "#2d2d2d"
  },
  {
    name: "Watermelon",
    accentColor: "#4ade80",
    backgroundColor: "#ff4d6d",
    cardColor: "#1d3932"
  },
  {
    name: "Forest",
    accentColor: "#4ade80",
    backgroundColor: "#0a2f1f",
    cardColor: "#e8d5b7"
  },
  {
    name: "Ice",
    accentColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    cardColor: "#dbeafe"
  },
  {
    name: "Gothic",
    accentColor: "#c27aff",
    backgroundColor: "#1e053a",
    cardColor: "#59168b"
  },
  {
    name: "Mac",
    accentColor: "#0066ff",
    backgroundColor: "#f0f0f2",
    cardColor: "#ffffff"
  },
  {
    name: "Cartoon",
    accentColor: "#ff5e5e",
    backgroundColor: "#fffaec",
    cardColor: "#ffffff"
  },
  {
    name: "Bubble Tea",
    accentColor: "#ff8904",
    backgroundColor: "#fefce8",
    cardColor: "#ffedd4"
  }
];

export default function CustomizePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [colors, setColors] = useState({
    accentColor: user?.accentColor || DEFAULT_COLORS.accentColor,
    backgroundColor: user?.backgroundColor || DEFAULT_COLORS.backgroundColor,
    cardColor: user?.cardColor || DEFAULT_COLORS.cardColor
  });

  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  const updateColorsMutation = useMutation({
    mutationFn: async (newColors: typeof colors) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, newColors);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Colors Updated",
        description: "Your Gamefolio colors have been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to save your color preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleColorChange = (colorType: string, color: string) => {
    setColors(prev => ({ ...prev, [colorType]: color }));
  };

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setColors({
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      cardColor: preset.cardColor
    });
  };

  const resetToDefaults = () => {
    setColors(DEFAULT_COLORS);
  };

  const saveColors = () => {
    updateColorsMutation.mutate(colors);
  };

  if (!user) {
    return <div>Please log in to customize your profile.</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            Customize Your Gamefolio
          </h1>
          <p className="text-gray-400 mt-2">Personalize your profile with custom colors and themes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Color Customization Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Color Customization</CardTitle>
                <CardDescription>Choose your custom colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Accent Color */}
                <div>
                  <Label className="text-white mb-2 block">Accent Color (Buttons & Highlights)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded border-2 border-gray-600 cursor-pointer"
                      style={{ backgroundColor: colors.accentColor }}
                      onClick={() => setActiveColorPicker(activeColorPicker === 'accent' ? null : 'accent')}
                    />
                    <span className="text-gray-300 font-mono">{colors.accentColor}</span>
                  </div>
                  {activeColorPicker === 'accent' && (
                    <div className="mt-3">
                      <HexColorPicker 
                        color={colors.accentColor} 
                        onChange={(color) => handleColorChange('accentColor', color)}
                      />
                    </div>
                  )}
                </div>

                {/* Background Color */}
                <div>
                  <Label className="text-white mb-2 block">Background Color</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded border-2 border-gray-600 cursor-pointer"
                      style={{ backgroundColor: colors.backgroundColor }}
                      onClick={() => setActiveColorPicker(activeColorPicker === 'background' ? null : 'background')}
                    />
                    <span className="text-gray-300 font-mono">{colors.backgroundColor}</span>
                  </div>
                  {activeColorPicker === 'background' && (
                    <div className="mt-3">
                      <HexColorPicker 
                        color={colors.backgroundColor} 
                        onChange={(color) => handleColorChange('backgroundColor', color)}
                      />
                    </div>
                  )}
                </div>

                {/* Card Color */}
                <div>
                  <Label className="text-white mb-2 block">Card Color</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded border-2 border-gray-600 cursor-pointer"
                      style={{ backgroundColor: colors.cardColor }}
                      onClick={() => setActiveColorPicker(activeColorPicker === 'card' ? null : 'card')}
                    />
                    <span className="text-gray-300 font-mono">{colors.cardColor}</span>
                  </div>
                  {activeColorPicker === 'card' && (
                    <div className="mt-3">
                      <HexColorPicker 
                        color={colors.cardColor} 
                        onChange={(color) => handleColorChange('cardColor', color)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={saveColors}
                    disabled={updateColorsMutation.isPending}
                    className="flex-1"
                    style={{ backgroundColor: colors.accentColor }}
                  >
                    {updateColorsMutation.isPending ? "Saving..." : "Save Colors"}
                  </Button>
                  <Button 
                    onClick={resetToDefaults}
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preset Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Preset Themes</CardTitle>
                <CardDescription>Quick color combinations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_THEMES.map((preset) => (
                    <div
                      key={preset.name}
                      className="p-3 rounded-lg border-2 border-gray-600 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: preset.accentColor }}
                        />
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: preset.backgroundColor }}
                        />
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: preset.cardColor }}
                        />
                      </div>
                      <p className="text-sm text-white font-medium">{preset.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>See how your profile will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-6 rounded-lg min-h-[400px]"
                  style={{ backgroundColor: colors.backgroundColor }}
                >
                  {/* Profile Header Preview */}
                  <div 
                    className="p-4 rounded-lg mb-4"
                    style={{ backgroundColor: colors.cardColor }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                      <div>
                        <h3 className="text-white font-bold">{user.displayName}</h3>
                        <p className="text-gray-300 text-sm">@{user.username}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      style={{ backgroundColor: colors.accentColor }}
                      className="text-white"
                    >
                      Follow
                    </Button>
                  </div>

                  {/* Clip Cards Preview */}
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: colors.cardColor }}
                      >
                        <div className="aspect-video bg-gray-700 rounded mb-2"></div>
                        <p className="text-white text-sm font-medium">Epic Gaming Moment {i}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            style={{ color: colors.accentColor }}
                            className="p-1 h-auto"
                          >
                            ♥ 24
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            style={{ color: colors.accentColor }}
                            className="p-1 h-auto"
                          >
                            💬 5
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}