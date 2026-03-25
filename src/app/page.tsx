"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageSquare, Users, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected to server");
      return;
    }
    
    setIsCreating(true);
    socket.emit("createRoom", (response: { roomCode: string }) => {
      setIsCreating(false);
      if (response && response.roomCode) {
        toast.success(`Room ${response.roomCode} created!`);
        router.push(`/chat/${response.roomCode}`);
      } else {
        toast.error("Failed to create room.");
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isConnected) {
      toast.error("Not connected to server");
      return;
    }

    if (!joinCode || joinCode.length < 3) {
      toast.error("Please enter a valid room code.");
      return;
    }

    setIsJoining(true);
    socket.emit("joinRoom", { roomCode: joinCode }, (response: { success: boolean, roomCode?: string, error?: string }) => {
      setIsJoining(false);
      if (response && response.success) {
        toast.success("Joined room successfully!");
        router.push(`/chat/${response.roomCode}`);
      } else {
        toast.error(response?.error || "Failed to join room.");
      }
    });
  };

  return (
    <main className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 shadow-xl ring-1 ring-white/10">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
            Nexus Chat
          </h1>
          <p className="text-slate-400">
            Real-time, minimalistic, anywhere.
          </p>
        </div>

        <Card className="bg-zinc-950/50 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-200">Get Started</CardTitle>
            <CardDescription className="text-slate-400">
              Create a new room or join an existing one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              className="w-full h-12 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
              onClick={handleCreateRoom}
              disabled={isCreating || !isConnected}
            >
              {isCreating ? (
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Create New Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-2 text-slate-500 rounded text-[10px] tracking-wider">
                  Or join with code
                </span>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="space-y-2">
                <Input
                  id="roomCode"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-black/40 border-white/10 h-12 text-center text-lg tracking-widest text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500/50 uppercase"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 transition-colors"
                disabled={isJoining || !joinCode || !isConnected}
              >
                Join Room
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-2 text-center text-xs text-slate-500 flex justify-center">
            {isConnected ? (
              <span className="flex items-center text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                Connected to servers
              </span>
            ) : (
              <span className="flex items-center text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400 mr-2 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                Connecting...
              </span>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
