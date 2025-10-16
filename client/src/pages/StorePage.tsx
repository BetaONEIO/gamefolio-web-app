import { Link } from "wouter";
import { ArrowLeft, ShoppingBag, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StorePage() {
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
          <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">Store</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Welcome to the Gamefolio Store - Coming Soon!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card data-testid="card-featured-item-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Featured Item 1
              </CardTitle>
              <CardDescription>
                This is a placeholder for a featured item in the store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Price: $0.00</p>
                  <p className="text-muted-foreground">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </div>
                <Button className="w-full" data-testid="button-view-item-1">
                  <Star className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-featured-item-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Featured Item 2
              </CardTitle>
              <CardDescription>
                This is another placeholder for a featured item in the store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Price: $0.00</p>
                  <p className="text-muted-foreground">Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </div>
                <Button className="w-full" data-testid="button-view-item-2">
                  <Star className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-featured-item-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Featured Item 3
              </CardTitle>
              <CardDescription>
                Yet another placeholder for a featured item in the store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Price: $0.00</p>
                  <p className="text-muted-foreground">Ut enim ad minim veniam, quis nostrud exercitation ullamco.</p>
                </div>
                <Button className="w-full" data-testid="button-view-item-3">
                  <Star className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold" data-testid="text-coming-soon">Coming Soon</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-store-description">
            We're working hard to bring you an amazing shopping experience. Stay tuned for exclusive gaming merchandise, 
            digital items, and special offers for the Gamefolio community!
          </p>
        </div>
      </div>
    </div>
  );
}
