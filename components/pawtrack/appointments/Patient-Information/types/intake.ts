export interface IntakeDetail {
  id?: string;
  visitId: string;
  weightKg: number;
  notes: string;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
  images: IntakeImage[];
  files: IntakeFile[];
}

export interface IntakeImage {
  id: string;
  imagePath: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeFile {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntakeDetailRequest {
  visitId: string;
  weightKg: number;
  notes: string;
  isCompleted: boolean;
  imagePaths: string[];
  files: File[];
}

export interface UpdateIntakeDetailRequest {
  id: string;
  visitId?: string;
  weightKg?: number;
  notes?: string;
  isCompleted?: boolean;
  imagePaths?: string[];
  files?: File[];
} 