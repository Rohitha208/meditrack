"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetIntakeByVisitId } from "@/queries/intake/get-intake-by-visit-id"
import { useCreateIntakeDetail } from "@/queries/intake/create-intake-detail"
import { useUpdateIntakeDetail } from "@/queries/intake/update-intake-detail"
import { useDeleteIntakeImage } from "@/queries/intake/delete-intake-image"
import { useDeleteIntakeFile } from "@/queries/intake/delete-intake-file"
import { Plus, Trash, Upload, Image, X, ZoomIn, ZoomOut, RotateCw, TrendingUp } from "lucide-react"
 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
import { useTabCompletion } from "@/context/TabCompletionContext"
import { Mic } from "lucide-react"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import WeightGraph from "@/components/pawtrack/appointments/WeightGraph"
import { toast } from "@/hooks/use-toast"

interface IntakeTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
  onComplete?: (completed: boolean) => void;
}

// Types to track image sources
interface StoredImage {
  id: string;
  path: string;
  isServerStored: true;
  type: 'image' | 'file'; // To differentiate between images and files
}

interface LocalImage {
  path: string;
  isServerStored: false;
}

type ImageItem = StoredImage | LocalImage;

export default function IntakeTab({ patientId, appointmentId, onNext, onComplete }: IntakeTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { markTabAsCompleted, isTabCompleted } = useTabCompletion()
  
  // State to track if we have an intake
  const [hasIntake, setHasIntake] = useState(false)
  
  // Get visit data from appointment ID
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId)
  
  // Get intake data by visitId if we have a visit
  const { data: intakeData, isLoading: intakeLoading, refetch: refetchIntake } = useGetIntakeByVisitId(
    visitData?.id || ""
  )
  const { data: appointmentData } = useGetAppointmentById(appointmentId)
  
  // Intake tab state
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined)
  const [imageItems, setImageItems] = useState<ImageItem[]>([])
  const [imagePaths, setImagePaths] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [notes, setNotes] = useState("")

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    weightKg: undefined as number | undefined,
    imagePaths: [] as string[],
    notes: ""
  })

  // Image viewer modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  
  // Delete confirmation modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null)
  
  // Weight graph modal state
  const [weightGraphOpen, setWeightGraphOpen] = useState(false)
  
  // Use mutateAsync pattern for better control flow
  const { mutateAsync: createIntakeDetail, isPending: isCreating } = useCreateIntakeDetail({})
  const { mutateAsync: updateIntakeDetail, isPending: isUpdating } = useUpdateIntakeDetail({})
  const { mutateAsync: deleteIntakeImage, isPending: isImageDeleting } = useDeleteIntakeImage({
    onSuccess: () => {
      // Refresh the intake data after deletion
      refetchIntake();
    },
  });
  const isIntakeCompleted = () => {
    return (
      weightKg !== undefined ||
      imagePaths.length > 0 ||
      notes.trim() !== ""
    );
  };

  const { mutateAsync: deleteIntakeFile, isPending: isFileDeleting } = useDeleteIntakeFile({
    onSuccess: () => {
      // Refresh the intake data after deletion
      refetchIntake();
    },
  });
  
  // Combined loading state
  const isPending = isCreating || isUpdating || isImageDeleting || isFileDeleting

  useEffect(() => {
    if (intakeData && onComplete) {
      onComplete(!!intakeData.isCompleted);
    }
  }, [intakeData, onComplete]);
  // Audio modal state
  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const transcriber = useTranscriber()

  const isReadOnly = appointmentData?.status === "completed";

  // Check if any changes have been made to existing data
  const hasChanges = () => {
    if (!intakeData) return true // For new records, allow save if data exists

    const currentImagePaths = [...imagePaths].sort()
    const originalImagePaths = [...originalValues.imagePaths].sort()

    return (
      weightKg !== originalValues.weightKg ||
      JSON.stringify(currentImagePaths) !== JSON.stringify(originalImagePaths) ||
      notes !== originalValues.notes
    )
  }

  // Initialize form with existing data when available
  useEffect(() => {
    if (intakeData) {
      setWeightKg(intakeData.weightKg);
      
      // Get API base URL from environment variable
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
      
      if (!apiBaseUrl) {
        console.warn('NEXT_PUBLIC_API_URL environment variable is not defined');
      }
      
      // Process both images and files arrays from the API response
      let paths: string[] = [];
      let items: ImageItem[] = [];
      
      // Process images array if it exists
      if (intakeData.images && intakeData.images.length > 0) {
        intakeData.images.forEach(img => {
          // Determine the full path
          let fullPath = img.imagePath;
          
          // Check if the path is already a full URL or a blob URL
          if (!fullPath.startsWith('http://') && 
              !fullPath.startsWith('https://') && 
              !fullPath.startsWith('blob:')) {
            // If it's a relative path, prepend the API URL
            fullPath = apiBaseUrl ? `${apiBaseUrl}/${fullPath}` : fullPath;
          }
          
          paths.push(fullPath);
          items.push({
            id: img.id,
            path: fullPath,
            isServerStored: true,
            type: 'image'
          });
        });
      }
      
      // Process files array if it exists
      if (intakeData.files && intakeData.files.length > 0) {
        intakeData.files.forEach(file => {
          // Format: "Uploads\\file.jpg" - convert backslashes and prepend API URL
          const formattedPath = file.filePath.replace(/\\/g, '/');
          const fullPath = apiBaseUrl ? `${apiBaseUrl}/${formattedPath}` : formattedPath;
          
          paths.push(fullPath);
          items.push({
            id: file.id,
            path: fullPath,
            isServerStored: true,
            type: 'file'
          });
        });
      }
      
      setImagePaths(paths);
      setImageItems(items);
      setNotes(intakeData.notes || "");
      setHasIntake(true);

      // Store original values for change detection
      setOriginalValues({
        weightKg: intakeData.weightKg,
        imagePaths: paths,
        notes: intakeData.notes || ""
      });

      // If intake is marked as completed, update the tab completion status
      if (intakeData.isCompleted) {
        markTabAsCompleted("intake");
      }
    }
  }, [intakeData, markTabAsCompleted]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any blob URLs to prevent memory leaks
      imagePaths.forEach(path => {
        if (path.startsWith('blob:')) {
          URL.revokeObjectURL(path);
        }
      });
    };
  }, []);

  const handleSaveIntake = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return
    }
    
    try {
      if (hasIntake && intakeData?.id) {
        // Update existing intake, ensuring ID is included
        await updateIntakeDetail({
          id: intakeData.id,
          visitId: intakeData.visitId || visitData?.id,
          weightKg: weightKg!,
          imagePaths,
          files: imageFiles,
          notes,
          isCompleted: isIntakeCompleted()
        })
        
        toast({
          title: "Success",
          description: "Intake detail updated successfully",
          variant: "success"
        })
      } else {
        // Create new intake
        await createIntakeDetail({
          visitId: visitData.id,
          weightKg: weightKg!,
          imagePaths,
          files: imageFiles,
          notes,
          isCompleted: isIntakeCompleted()
        })
        
        toast({
          title: "Success",
          description: "Intake detail saved successfully",
          variant: "success"
        })
        setHasIntake(true);
      }
      
      // Mark tab as completed
      markTabAsCompleted("intake");
      
      // Refetch intake data and navigate to next tab
      refetchIntake();
      
      // Always call onComplete with the actual completion status
      if (onComplete) {
        onComplete(isIntakeCompleted());
      }
      
      // Always call onNext when data is saved successfully
      if (onNext) {
        onNext();
      }
    } catch (error) {
      console.error('Error saving intake details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save intake detail",
        variant: "destructive"
      })
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setImageFiles(prev => [...prev, ...newFiles])
      
      // Create object URLs for the files to display them
      const newPaths = newFiles.map(file => {
        return URL.createObjectURL(file)
      })
      
      // Add to image paths
      setImagePaths(prev => [...prev, ...newPaths])
      
      // Add to image items as local images
      const newItems: LocalImage[] = newPaths.map(path => ({
        path,
        isServerStored: false
      }))
      setImageItems(prev => [...prev, ...newItems])
      
      // Reset input value so the same file can be selected again if needed
      e.target.value = ''
    }
  }

  // Replace direct delete with confirmation dialog
  const confirmDelete = (index: number) => {
    setIndexToDelete(index);
    setDeleteDialogOpen(true);
  }
  
  // Called after confirmation
  const handleConfirmedDelete = async () => {
    if (indexToDelete === null) return;
    
    try {
      await removeImagePath(indexToDelete);
      setDeleteDialogOpen(false);
      setIndexToDelete(null);
    } catch (error) {
      console.error('Error in handleConfirmedDelete', error);
    }
  }
  
  // Cancel delete operation
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setIndexToDelete(null);
  }

  // Existing removeImagePath function (unchanged, will be called after confirmation)
  const removeImagePath = async (index: number) => {
    const imageItem = imageItems[index];
    
    try {
      // If image is stored on server, delete from API first
      if (imageItem.isServerStored) {
        if (imageItem.type === 'image') {
          await deleteIntakeImage({ 
            imageId: imageItem.id, 
            intakeDetailId: intakeData?.id 
          });
        } else if (imageItem.type === 'file') {
          await deleteIntakeFile({
            fileId: imageItem.id,
            intakeDetailId: intakeData?.id
          });
        }
        
        toast({
          title: "Success",
          description: "Image deleted successfully",
          variant: "success"
        });
      } else {
        // For local image, release the blob URL
        if (imagePaths[index].startsWith('blob:')) {
          URL.revokeObjectURL(imagePaths[index]);
        }
      }
      
      // Update local state
      const updatedItems = [...imageItems];
      updatedItems.splice(index, 1);
      setImageItems(updatedItems);
      
      const updatedPaths = [...imagePaths];
      updatedPaths.splice(index, 1);
      setImagePaths(updatedPaths);
      
      const updatedFiles = [...imageFiles];
      // Only remove from imageFiles if it's a local file (not server image)
      if (!imageItem.isServerStored) {
        // Find the correct index in the imageFiles array
        const fileIdx = imageFiles.findIndex((_, i) => {
          const pathsForFiles = imagePaths.filter((_, i) => !imageItems[i].isServerStored);
          return pathsForFiles.indexOf(imagePaths[index]) === i;
        });
        if (fileIdx !== -1) {
          updatedFiles.splice(fileIdx, 1);
        }
      }
      setImageFiles(updatedFiles);
      
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive"
      });
    }
  }
  
  // Function to open image viewer
  const openImageViewer = (imagePath: string) => {
    setSelectedImage(imagePath);
    setImageZoom(1);  // Reset zoom level
    setImageRotation(0);  // Reset rotation
  }
  
  // Function to close image viewer
  const closeImageViewer = () => {
    setSelectedImage(null);
  }
  
  // Function to zoom in
  const zoomIn = () => {
    setImageZoom(prev => Math.min(3, prev + 0.2));
  }
  
  // Function to zoom out
  const zoomOut = () => {
    setImageZoom(prev => Math.max(0.5, prev - 0.2));
  }
  
  // Function to rotate image
  const rotateImage = () => {
    setImageRotation(prev => (prev + 90) % 360);
  }

  useEffect(() => {
    if (
      transcriber.output &&
      !transcriber.output.isBusy &&
      transcriber.output.text
    ) {
      setNotes(prev => prev ? prev + "\n" + transcriber.output!.text : transcriber.output!.text)
    }
    // Only run when transcription completes
    // eslint-disable-next-line
  }, [transcriber.output?.isBusy])

  if (visitLoading || intakeLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading visit data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!visitData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">No visit found for this appointment. Please make sure a visit has been created.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Intake Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="weightKg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (kg)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  value={weightKg || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setWeightKg(value === "" ? undefined : parseFloat(value));
                    }
                  }}
                  className="w-full max-w-xs"
                  disabled={isReadOnly}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setWeightGraphOpen(true)}
                  title="View weight history graph"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Photos
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={triggerFileInput}
                  className="flex items-center"
                  disabled={isReadOnly}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                
                {imagePaths.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {imagePaths.map((path, index) => (
                      <div key={index} className="relative border rounded p-2 h-24 w-24">
                        {path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://') ? (
                          <img 
                            src={path} 
                            alt={`Patient photo ${index + 1}`}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => openImageViewer(path)}
                          />
                        ) : (
                          <div 
                            className="flex items-center justify-center h-full w-full cursor-pointer" 
                            onClick={() => openImageViewer(path)}
                          >
                            <Image className="h-8 w-8 opacity-50" />
                            <span className="text-xs mt-1">{path.split('/').pop()}</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white p-0"
                          onClick={() => confirmDelete(index)}
                          disabled={isPending || isReadOnly}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No photos uploaded</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setAudioModalOpen(true)}
                  title="Record voice note"
                  disabled={isReadOnly}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-32"
                disabled={isReadOnly}
              />
            </div>
            <AudioManager
              open={audioModalOpen}
              onClose={() => setAudioModalOpen(false)}
              transcriber={transcriber}
              onTranscriptionComplete={(transcript: string) => {
                setNotes(prev => prev ? prev + "\n" + transcript : transcript)
                setAudioModalOpen(false)
              }}
            />

           
          </div>
          </div>
          <div className="mt-6 flex justify-end mb-4 mx-4">
              <Button
                onClick={handleSaveIntake}
                disabled={
                  weightKg === undefined ||
                  isPending ||
                  isReadOnly ||
                  (!!intakeData && !hasChanges())
                }
                className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
              >
                {isPending
                  ? "Saving..."
                  : hasIntake ? "Update & Next" : "Save & Next"}
              </Button>
            </div>
        </CardContent>
      </Card>
      
      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={open => !open && closeImageViewer()}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Image Viewer</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={rotateImage}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto w-full h-full flex items-center justify-center p-2">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Patient photo"
                className="max-w-full max-h-full object-contain transition-transform duration-200 ease-in-out"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={cancelDelete}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleConfirmedDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weight Graph Modal */}
      <Dialog open={weightGraphOpen} onOpenChange={setWeightGraphOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Weight History</DialogTitle>
            <DialogDescription>
              View the patient's weight history over time
            </DialogDescription>
          </DialogHeader>
          <WeightGraph 
            patientId={patientId} 
            isOpen={weightGraphOpen} 
            onClose={() => setWeightGraphOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  )
}