import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PressKitUploadProps {
  value: string;
  onChange: (url: string) => void;
  userId: string;
}

export function PressKitUpload({ value, onChange, userId }: PressKitUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF must be under 25MB");
      return;
    }

    setUploading(true);
    try {
      const path = `${userId}/press-kit.pdf`;
      const { error } = await supabase.storage
        .from("press-kits")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("press-kits").getPublicUrl(path);
      onChange(`${data.publicUrl}?t=${Date.now()}`);
      toast.success("Press kit uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    toast.success("Press kit removed (save to apply)");
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleUpload}
        className="hidden"
      />
      {value ? (
        <div className="flex items-center gap-2 border border-border rounded-lg p-3 bg-background">
          <FileText size={18} className="text-primary shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:text-primary truncate flex-1"
          >
            View current press kit
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : "Replace"}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={handleRemove}>
            <Trash2 size={14} />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2 h-12"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Upload size={16} />
              <span className="text-xs">Upload Press Kit (PDF)</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
