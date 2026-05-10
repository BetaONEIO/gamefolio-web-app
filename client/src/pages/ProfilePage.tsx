import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, UserPlus, Clock, X, Heart } from "lucide-react";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";

export default function ProfilePage() {
  return null;
}
