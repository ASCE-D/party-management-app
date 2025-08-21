export interface Party {
  id: number;
  name: string;
  created_at: string;
}

export interface ReceiveRecord {
  id: number;
  party_name: string;
  lr_number: string;
  amount: number;
  date: string;
  other_details?: string;
  files: FileAttachment[];
  created_at: string;
  updated_at: string;
}

export interface SendRecord {
  id: number;
  amount: number;
  party_name?: string;
  lr_number?: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface FileAttachment {
  id: number;
  record_id: number;
  file_name: string;
  file_path: string;
  file_type: "image" | "pdf";
  created_at: string;
}
