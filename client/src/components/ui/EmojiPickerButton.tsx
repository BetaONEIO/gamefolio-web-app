import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI_ROWS = [
  ["😀","😂","😍","🥰","😎","🤩","😅","🤣","😭","😤"],
  ["👍","👎","❤️","🔥","💯","🎉","✨","⭐","💀","🫶"],
  ["🎮","🏆","💪","🙌","👀","😱","🤔","🫡","🚀","💥"],
  ["😏","😬","🥲","🫠","😤","😡","🤯","🥳","😴","🤫"],
  ["👾","🕹️","🫵","🤝","✅","❌","⚡","💎","🌟","🎯"],
];

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPickerButton({ onEmojiSelect }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden sm:flex h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="end"
        sideOffset={6}
      >
        <div className="flex flex-col gap-1">
          {EMOJI_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-0.5">
              {row.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-base leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
