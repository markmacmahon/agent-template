import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-8">
      <div className="text-center max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="rounded-full bg-primary p-6">
            <Bot className="h-16 w-16 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground">
            ChatBot Application Starter
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          Build intelligent conversational AI applications with a modern,
          type-safe full-stack framework.
        </p>

        {/* Link to Dashboard */}
        <Link href="/dashboard">
          <Button className="px-8 py-4 text-xl font-semibold rounded-full shadow-lg">
            Go to Dashboard
          </Button>
        </Link>

        {/* GitHub Badge */}
        <div className="mt-6">
          <Badge
            variant="outline"
            className="text-sm flex items-center gap-2 px-3 py-2 rounded-lg"
          >
            <FaGithub className="w-5 h-5" />
            <Link
              href="https://github.com/markmacmahon/agent-template"
              target="_blank"
              className="hover:underline"
            >
              View on GitHub
            </Link>
          </Badge>
        </div>
      </div>
    </main>
  );
}
