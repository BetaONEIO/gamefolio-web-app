import { Link } from "wouter";
import { ArrowLeft, Wallet, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">Wallet</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your gaming credits and transactions
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card data-testid="card-balance">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Current Balance
              </CardTitle>
              <CardDescription>
                Your available gaming credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-primary">$0.00</div>
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <Button className="w-full" data-testid="button-add-funds">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-rewards">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Rewards Points
              </CardTitle>
              <CardDescription>
                Earn points for gaming activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-primary">0 pts</div>
                <p className="text-sm text-muted-foreground">Start earning rewards today!</p>
                <Button variant="outline" className="w-full" data-testid="button-view-rewards">
                  View Rewards Program
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-payment-methods">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your payment options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No payment methods saved</p>
                <Button variant="outline" className="w-full" data-testid="button-add-payment">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold" data-testid="text-coming-soon">Coming Soon</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-wallet-description">
            We're building a secure wallet system to manage your gaming credits, rewards, and transactions. 
            Stay tuned for exciting features including earning opportunities, exclusive deals, and seamless payments!
          </p>
        </div>
      </div>
    </div>
  );
}
