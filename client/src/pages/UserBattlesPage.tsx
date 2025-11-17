import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lock, Trophy, Zap, Shield, Swords, Crown, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BattleUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level?: number;
  totalXP?: number;
}

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Soiwasafk1!";
const SESSION_KEY = "user_battles_session";

export default function UserBattlesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [battleActive, setBattleActive] = useState(false);
  const [eliminatedUsers, setEliminatedUsers] = useState<Set<number>>(new Set());
  const [winner, setWinner] = useState<BattleUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const { data: users = [], refetch } = useQuery<BattleUser[]>({
    queryKey: ["/api/users/random"],
    enabled: isAuthenticated,
    refetchInterval: false,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "authenticated");
      setIsAuthenticated(true);
      toast({
        title: "Login successful",
        description: "Welcome to the Battle Arena!",
      });
    } else {
      setLoginError("Invalid credentials");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setBattleActive(false);
    setEliminatedUsers(new Set());
    setWinner(null);
  };

  const startBattle = () => {
    setEliminatedUsers(new Set());
    setWinner(null);
    setBattleActive(true);
    
    const battleDuration = 8000;
    const eliminationInterval = 1000;
    const eliminationsPerRound = 1;

    let currentEliminated = new Set<number>();
    const totalUsers = users.length;
    const interval = setInterval(() => {
      if (currentEliminated.size >= totalUsers - 1) {
        clearInterval(interval);
        const survivingUser = users.find(u => !currentEliminated.has(u.id));
        if (survivingUser) {
          setWinner(survivingUser);
          setBattleActive(false);
          toast({
            title: "Victory Royale!",
            description: `${survivingUser.displayName} wins the battle!`,
          });
        }
        return;
      }

      const availableUsers = users.filter(u => !currentEliminated.has(u.id));
      for (let i = 0; i < eliminationsPerRound && availableUsers.length > 1; i++) {
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        const eliminatedUser = availableUsers[randomIndex];
        currentEliminated.add(eliminatedUser.id);
        availableUsers.splice(randomIndex, 1);
      }
      
      setEliminatedUsers(new Set(currentEliminated));
    }, eliminationInterval);
  };

  const resetBattle = () => {
    refetch();
    setEliminatedUsers(new Set());
    setWinner(null);
    setBattleActive(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Battle Arena</CardTitle>
            <p className="text-muted-foreground">Admin access required</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-primary/20"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-primary/20"
                  data-testid="input-password"
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-500" data-testid="text-login-error">
                  {loginError}
                </p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                data-testid="button-login"
              >
                <Lock className="w-4 h-4 mr-2" />
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aliveUsers = users.filter(u => !eliminatedUsers.has(u.id));
  const deadUsers = users.filter(u => eliminatedUsers.has(u.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Swords className="w-10 h-10 text-primary" />
              User Battle Royale
            </h1>
            <p className="text-muted-foreground mt-2">
              Watch users compete in an epic battle arena
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alive</p>
                  <p className="text-3xl font-bold text-green-500">{aliveUsers.length}</p>
                </div>
                <Shield className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eliminated</p>
                  <p className="text-3xl font-bold text-red-500">{eliminatedUsers.size}</p>
                </div>
                <Zap className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fighters</p>
                  <p className="text-3xl font-bold text-yellow-500">{users.length}</p>
                </div>
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={startBattle}
            disabled={battleActive || users.length < 2}
            size="lg"
            className="px-8"
            data-testid="button-start-battle"
          >
            <Flame className="w-5 h-5 mr-2" />
            {battleActive ? "Battle in Progress..." : "Start Battle"}
          </Button>
          <Button
            onClick={resetBattle}
            variant="outline"
            size="lg"
            className="px-8"
            data-testid="button-reset-battle"
          >
            Reset Arena
          </Button>
        </div>

        {winner && (
          <Card className="border-4 border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 animate-in fade-in zoom-in duration-500">
            <CardContent className="p-8 text-center">
              <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-4xl font-bold mb-4 text-yellow-500">Victory Royale!</h2>
              <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-yellow-500 shadow-2xl">
                <AvatarImage src={winner.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-3xl">
                  {winner.displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-3xl font-bold">{winner.displayName}</p>
              <p className="text-muted-foreground text-lg">@{winner.username}</p>
              <Badge className="mt-4 text-lg px-4 py-2" variant="secondary">
                Level {winner.level || 1}
              </Badge>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Shield className="w-5 h-5" />
                Alive ({aliveUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {aliveUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex flex-col items-center p-4 rounded-lg bg-green-500/10 border border-green-500/30 transition-all hover:scale-105 hover:shadow-lg animate-in fade-in slide-in-from-bottom duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                    data-testid={`card-user-alive-${user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-2 border-green-500 shadow-lg">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/20">
                          {user.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {battleActive && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2 text-center truncate w-full">
                      {user.displayName}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Lvl {user.level || 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <Zap className="w-5 h-5" />
                Eliminated ({eliminatedUsers.size})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {deadUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex flex-col items-center p-4 rounded-lg bg-red-500/10 border border-red-500/30 opacity-50 grayscale"
                    data-testid={`card-user-eliminated-${user.id}`}
                  >
                    <Avatar className="w-16 h-16 border-2 border-red-500">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20">
                        {user.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium mt-2 text-center truncate w-full line-through">
                      {user.displayName}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Lvl {user.level || 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
