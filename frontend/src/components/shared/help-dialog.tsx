import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { HelpCircle } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface HelpDialogProps {
  title: string;
  subtitle: string;
  features: Feature[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ title, subtitle, features, isOpen, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border shadow-2xl p-0 overflow-hidden rounded-3xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-foreground">{title}</DialogTitle>
              <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-4 rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors space-y-2"
              >
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <h4 className="font-bold text-foreground">{feature.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-foreground text-background hover:opacity-90 font-bold px-8 rounded-xl h-12"
            >
              Got it, thanks!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
