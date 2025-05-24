import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { User, Crown, Trophy, Star, Upload, X } from "lucide-react";

interface UsernameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onUserCreated: (user: any) => void;
}

const usernameFormSchema = insertUserSchema.extend({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  profilePictureUrl: z.string().optional()
});

export function UsernameModal({ open, onOpenChange, walletAddress, onUserCreated }: UsernameModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof usernameFormSchema>>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: {
      username: "",
      walletAddress: walletAddress,
      profilePictureUrl: "",
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert("Please select an image file");
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue('profilePictureUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    form.setValue('profilePictureUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof usernameFormSchema>) => {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to create user";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // If response isn't JSON, use default message
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      return result;
    },
    onSuccess: (user) => {
      // Invalidate user queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onUserCreated(user);
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to create username";
      if (errorMessage.includes("Username already taken")) {
        form.setError("username", { message: "This username is already taken" });
      } else {
        form.setError("username", { message: errorMessage });
      }
    },
  });

  const onSubmit = (data: z.infer<typeof usernameFormSchema>) => {
    setIsLoading(true);
    // Ensure profile picture is included in the submission
    const submitData = {
      ...data,
      profilePictureUrl: imagePreview || data.profilePictureUrl || ''
    };
    console.log('Submitting user data:', { ...submitData, profilePictureUrl: submitData.profilePictureUrl ? 'data:image/...' : 'empty' });
    createUserMutation.mutate(submitData);
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Choose Your Username
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a unique username to start your memecoin journey. This will be your identity on the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-2">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-zinc-400">Create Tokens</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-2">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-zinc-400">Trade & Earn</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-2">
              <Star className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-zinc-400">Earn Badges</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your username"
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500"
                      disabled={isLoading || createUserMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Profile Picture (Optional)</label>
              <div className="flex items-center space-x-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-zinc-500" />
                  </div>
                )}
                
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isLoading || createUserMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:border-orange-500"
                    disabled={isLoading || createUserMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {imagePreview ? 'Change Picture' : 'Upload Picture'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">Upload an image (max 5MB). JPG, PNG, GIF supported.</p>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
              disabled={isLoading || createUserMutation.isPending}
            >
              {isLoading || createUserMutation.isPending ? "Creating..." : "Create Username"}
            </Button>
          </form>
        </Form>

        <p className="text-xs text-zinc-500 text-center">
          Your username cannot be changed later, so choose wisely!
        </p>
      </DialogContent>
    </Dialog>
  );
}