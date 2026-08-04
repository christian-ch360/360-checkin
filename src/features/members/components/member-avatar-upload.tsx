"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCroppedImageBlob } from "@/features/members/utils/crop-image";
import { uploadMemberPhoto } from "@/features/members/services/actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function MemberAvatarUpload({
  memberId,
  currentUrl,
  fullName,
  canEdit,
  size = 80,
}: {
  memberId: string;
  currentUrl: string | null;
  fullName: string;
  canEdit: boolean;
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(currentUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, startUpload] = useTransition();

  function openPicker() {
    if (canEdit) inputRef.current?.click();
  }

  function loadFile(file: File | undefined) {
    if (!file || !canEdit) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function closeCropDialog() {
    setPendingImage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function saveCroppedPhoto() {
    if (!pendingImage || !croppedAreaPixels) return;
    startUpload(async () => {
      try {
        const blob = await getCroppedImageBlob(pendingImage, croppedAreaPixels);
        const formData = new FormData();
        formData.set("file", blob, "avatar.webp");
        const result = await uploadMemberPhoto(memberId, formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setPhotoUrl(result.photoUrl);
        toast.success("Photo updated");
        closeCropDialog();
        router.refresh();
      } catch {
        toast.error("Couldn't process that image. Try a different photo.");
      }
    });
  }

  return (
    <>
      <div
        className={cn("group relative shrink-0 rounded-full", canEdit && "cursor-pointer")}
        style={{ width: size, height: size }}
        onClick={openPicker}
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setIsDragging(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
      >
        <Avatar className="size-full border-4 border-card">
          {photoUrl && <AvatarImage src={photoUrl} alt={fullName} />}
          <AvatarFallback className="text-2xl">{initials(fullName)}</AvatarFallback>
        </Avatar>

        {canEdit && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100",
              isDragging && "opacity-100 ring-2 ring-primary ring-offset-2"
            )}
          >
            <Camera className="size-1/3 text-white" />
          </div>
        )}

        {canEdit && (
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
        )}
      </div>

      <Dialog open={!!pendingImage} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update your photo</DialogTitle>
            <DialogDescription>Drag to reposition, use the slider to zoom.</DialogDescription>
          </DialogHeader>

          {pendingImage && (
            <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                image={pendingImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}

          <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([v]) => setZoom(v)} />

          <DialogFooter>
            <Button variant="outline" onClick={closeCropDialog} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={saveCroppedPhoto} disabled={isUploading || !croppedAreaPixels}>
              {isUploading && <Loader2 className="size-4 animate-spin" />}
              {isUploading ? "Uploading…" : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
