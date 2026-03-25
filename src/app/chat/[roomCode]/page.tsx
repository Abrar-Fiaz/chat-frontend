"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Copy, Send, LogOut, Loader2, User } from "lucide-react";
import { toast } from "sonner";

// Next.js 15 pages receive `params` as a Promise
export default function ChatRoom(props: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [roomCode, setRoomCode] = useState<string>("");
  const params = use(props.params);
  
  const [messages, setMessages] = useState<{ sender: string; message: string; timestamp: string; isSelf: boolean }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isJoining, setIsJoining] = useState(true);
  
  // A unique name for this session, could just be a random string or let user set it. 
  // We'll generate a random guest name on load.
  const [username] = useState(() => `Guest_${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.roomCode) setRoomCode(params.roomCode.toUpperCase());
  }, [params]);

  useEffect(() => {
    if (!socket || !isConnected || !roomCode) return;

    // Join room when landing on page directly
    socket.emit("joinRoom", { roomCode }, (response: { success: boolean, roomCode?: string, error?: string }) => {
      setIsJoining(false);
      if (!response.success) {
        toast.error(response.error || "Failed to join room");
        router.push("/");
      }
    });

    const handleReceiveMessage = (payload: { sender: string; message: string; timestamp: string }) => {
      setMessages((prev) => [...prev, { ...payload, isSelf: payload.sender === username }]);
    };
    
    const handleUserJoined = (payload: { message: string }) => {
      toast.info(payload.message);
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("userJoined", handleUserJoined);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("userJoined", handleUserJoined);
    };
  }, [socket, isConnected, roomCode, router, username]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !isConnected) return;

    const messagePayload = {
      roomCode,
      message: inputValue.trim(),
      sender: username,
    };

    socket.emit("sendMessage", messagePayload);
    // Optimistically add to list handled by receiving the broadcast from server, 
    // or add it locally. We'll add it locally and let the server broadcast handle the others.
    // Actually, in our gateway: broadcast goes to everyone in room including sender.
    setInputValue("");
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success("Room code copied to clipboard!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleLeaveRoom = () => {
    // We could emit a leaveRoom event, but simply redirecting and disconnecting
    // or dropping the socket from the room works. With this setup, going to Home page
    // doesn't explicitly leave the room in socket io (client is still joined until disconnect).
    // For simplicity, we just redirect. A real app might handle explicit leave.
    router.push("/");
  };

  if (!isConnected || isJoining) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <h2 className="text-xl font-medium tracking-tight">Connecting to Room...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 relative selection:bg-indigo-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col bg-zinc-950/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <header className="h-20 border-b border-white/10 bg-zinc-900/40 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-xl ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
              <span className="font-bold tracking-wider">{roomCode.slice(0, 2)}</span>
            </div>
            <div>
              <h2 className="font-semibold text-lg flex items-center tracking-tight text-slate-200">
                Room <span className="text-indigo-400 ml-2 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono">{roomCode}</span>
              </h2>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse" />
                Live Connection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyCode}
              className="bg-white/5 border-white/10 hover:bg-white/15 text-slate-300 transition-colors h-9"
            >
              <Copy className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Copy Code</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLeaveRoom}
              className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-rose-300 border border-rose-500/20 transition-colors h-9"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-6 pb-4 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 my-20">
                <div className="p-4 rounded-full bg-white/5 ring-1 ring-white/10">
                  <User className="w-8 h-8 opacity-50" />
                </div>
                <p>No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[80%] ${msg.isSelf ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <span className="text-xs text-slate-500 mb-1.5 px-1 font-medium tracking-wide">
                    {msg.isSelf ? "You" : msg.sender}
                  </span>
                  <div 
                    className={`px-5 py-3 rounded-2xl ${
                      msg.isSelf 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-[0_5px_15px_rgba(79,70,229,0.2)]' 
                        : 'bg-zinc-800 text-slate-200 rounded-tl-sm border border-white/5 shadow-lg'
                    }`}
                  >
                    <p className="leading-relaxed text-[15px]">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-zinc-900/50 border-t border-white/10 backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="flex gap-3 relative max-w-4xl mx-auto">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-black/40 border-white/15 h-12 rounded-xl text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500 px-4 shadow-inner"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!inputValue.trim()}
              className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
