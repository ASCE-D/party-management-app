import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSelect,
  IonSelectOption,
  IonActionSheet,
  IonIcon,
  IonChip,
  IonAlert,
  IonToast,
  IonDatetime,
  IonModal,
  IonButtons,
  IonThumbnail,
  IonImg,
  IonProgressBar,
  IonList,
} from "@ionic/react";
import {
  camera,
  document,
  trash,
  checkmark,
  close,
  add,
  attach,
  eye,
  warning,
  checkmarkCircle,
  closeCircle,
} from "ionicons/icons";

import { dbService } from "../services/database.service";
import { fileService } from "../services/file.service";
import { Party, ReceiveRecord } from "../types";

interface FileAttachment {
  name: string;
  path: string;
  type: "image" | "pdf";
  preview?: string; // For image previews
  size?: number;
  status?: "uploading" | "success" | "error";
  base64?: string; // Optional base64 data
  mimeType?: string; // Optional mime type
}

const ReceiveTab: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [newPartyName, setNewPartyName] = useState<string>("");
  const [lrNumber, setLrNumber] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString()
  );
  const [otherDetails, setOtherDetails] = useState<string>("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState<string>("primary");
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const partiesList = await dbService.getParties();
      setParties(partiesList);
    } catch (error) {
      console.error("Error loading parties:", error);
    }
  };

  const showToastMessage = (message: string, color: string = "primary") => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  const handleAddAttachment = () => {
    setIsActionSheetOpen(true);
  };

  const updateAttachmentStatus = (
    index: number,
    status: "uploading" | "success" | "error"
  ) => {
    setAttachments((prev) =>
      prev.map((att, i) => (i === index ? { ...att, status } : att))
    );
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploading(true);
      const result = await fileService.takePhoto();

      if (result) {
        console.log("[DEBUG] Photo result:", {
          name: result.name,
          path: result.path,
        });

        const newAttachment: FileAttachment = {
          name: result.name,
          path: result.path,
          type: "image",
          status: "uploading", // This will be updated shortly
          preview: result.preview, // Use the preview from the service
          base64: result.base64, // IMPORTANT: Store the base64 data
          mimeType: result.mimeType, // Store the mimeType
          size: result.size, // IMPORTANT: Store the file size
        };


        // Try to create a preview from the path if it's a blob URL or data URL
        if (
          result.path &&
          (result.path.startsWith("blob:") || result.path.startsWith("data:"))
        ) {
          newAttachment.preview = result.path;
        }

        // Add to attachments immediately with uploading status
        const currentIndex = attachments.length;
        setAttachments((prev) => [...prev, newAttachment]);

        setTimeout(() => {
          updateAttachmentStatus(currentIndex, "success");
          showToastMessage("Photo captured successfully!", "success");
        }, 1000);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showToastMessage("Error capturing photo", "danger");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setIsUploading(true);
      const result = await fileService.pickImage();

      if (result) {
        const newAttachment: FileAttachment = {
          name: result.name,
          path: result.path,
          type: "image",
          status: "uploading",
        };

        const currentIndex = attachments.length;
        setAttachments((prev) => [...prev, newAttachment]);

        // Create preview for images if path is available
        if (result.path) {
          try {
            // If the path is a data URL or blob URL, use it as preview
            if (
              result.path.startsWith("data:") ||
              result.path.startsWith("blob:")
            ) {
              newAttachment.preview = result.path;
              setAttachments((prev) =>
                prev.map((att, i) =>
                  i === currentIndex ? { ...att, preview: result.path } : att
                )
              );
            }
          } catch (error) {
            console.log("Could not create preview:", error);
          }
        }

        setTimeout(() => {
          updateAttachmentStatus(currentIndex, "success");
          showToastMessage("Image selected successfully!", "success");
        }, 1000);
      } else {
        showToastMessage("No image selected", "warning");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showToastMessage("Error selecting image", "danger");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickPDF = async () => {
    try {
      setIsUploading(true);
      const result = await fileService.pickPDF();

      if (result) {
        const newAttachment: FileAttachment = {
          name: result.name,
          path: result.path,
          type: "pdf",
          status: "uploading",
        };

        const currentIndex = attachments.length;
        setAttachments((prev) => [...prev, newAttachment]);

        setTimeout(() => {
          updateAttachmentStatus(currentIndex, "success");
          showToastMessage("PDF selected successfully!", "success");
        }, 1000);
      } else {
        showToastMessage("No PDF selected", "warning");
      }
    } catch (error) {
      console.error("Error picking PDF:", error);
      showToastMessage("Error selecting PDF", "danger");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    showToastMessage(`${attachment.name} removed`, "medium");
  };

  const previewAttachment = (attachment: FileAttachment) => {
    setPreviewFile(attachment);
    setIsPreviewModalOpen(true);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "uploading":
        return null; // Will show progress bar
      case "success":
        return checkmarkCircle;
      case "error":
        return closeCircle;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "success";
      case "error":
        return "danger";
      case "uploading":
        return "primary";
      default:
        return "primary";
    }
  };

  const handleSubmit = async () => {
    if (!selectedParty && !newPartyName) {
      showToastMessage("Please select or enter a party name", "warning");
      return;
    }

    if (!lrNumber.trim()) {
      showToastMessage("LR Number is required", "warning");
      return;
    }

    if (amount <= 0) {
      showToastMessage("Please enter a valid amount", "warning");
      return;
    }

    // Check if any files are still uploading
    const uploadingFiles = attachments.filter(
      (att) => att.status === "uploading"
    );
    if (uploadingFiles.length > 0) {
      showToastMessage("Please wait for file uploads to complete", "warning");
      return;
    }

    try {
      setIsUploading(true);
      const partyName = newPartyName || selectedParty;

      const recordData = {
        party_name: partyName,
        lr_number: lrNumber,
        amount: amount,
        date: selectedDate.split("T")[0],
        other_details: otherDetails || undefined,
      };

      const recordId = await dbService.addReceiveRecord(recordData);

      // Add file attachments
      let successfulAttachments = 0;
      let failedAttachments = 0;

      for (const attachment of attachments) {
        try {
          await dbService.addFileAttachment({
            record_id: recordId,
            record_type: "receive",
            file_name: attachment.name,
            file_path: attachment.path,
            file_type: attachment.type,
            base64_data: attachment.base64, // Correct: Use the stored raw base64 data
            mime_type: attachment.mimeType, // Correct: Use the stored mime type
            file_size: attachment.size, // Correct: Use the stored size
          });
          successfulAttachments++;
        } catch (error) {
          console.error("Error saving attachment:", error);
          failedAttachments++;
        }
      }

      // Reset form
      setSelectedParty("");
      setNewPartyName("");
      setLrNumber("");
      setAmount(0);
      setSelectedDate(new Date().toISOString());
      setOtherDetails("");
      setAttachments([]);

      // Reload parties in case new one was added
      await loadParties();

      // Show success message with attachment info
      let message = "Record saved successfully!";
      if (successfulAttachments > 0) {
        message += ` ${successfulAttachments} file(s) attached.`;
      }
      if (failedAttachments > 0) {
        message += ` ${failedAttachments} file(s) failed to upload.`;
      }

      showToastMessage(message, failedAttachments > 0 ? "warning" : "success");
    } catch (error) {
      console.error("Error saving record:", error);
      showToastMessage("Error saving record", "danger");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Receive</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>New Receive Record</IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            {/* Party Selection */}
            <IonItem>
              <IonLabel position="stacked">Select Party</IonLabel>
              <IonSelect
                value={selectedParty}
                onIonChange={(e) => setSelectedParty(e.detail.value)}
                placeholder="Choose existing party"
              >
                {parties.map((party) => (
                  <IonSelectOption key={party.id} value={party.name}>
                    {party.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* New Party Name */}
            <IonItem>
              <IonLabel position="stacked">Or Enter New Party Name</IonLabel>
              <IonInput
                value={newPartyName}
                onIonInput={(e) => setNewPartyName(e.detail.value!)}
                placeholder="Enter party name"
                clearInput
              />
            </IonItem>

            {/* LR Number */}
            <IonItem>
              <IonLabel position="stacked">LR Number *</IonLabel>
              <IonInput
                value={lrNumber}
                onIonInput={(e) => setLrNumber(e.detail.value!)}
                placeholder="Enter LR number"
                clearInput
                required
              />
            </IonItem>

            {/* Amount */}
            <IonItem>
              <IonLabel position="stacked">Amount *</IonLabel>
              <IonInput
                type="number"
                value={amount}
                onIonInput={(e) => setAmount(parseFloat(e.detail.value!) || 0)}
                placeholder="Enter amount"
                required
              />
            </IonItem>

            {/* Date */}
            <IonItem button onClick={() => setIsDateModalOpen(true)}>
              <IonLabel position="stacked">Date *</IonLabel>
              <IonLabel>{new Date(selectedDate).toLocaleDateString()}</IonLabel>
            </IonItem>

            {/* Other Details */}
            <IonItem>
              <IonLabel position="stacked">Other Details (Optional)</IonLabel>
              <IonTextarea
                value={otherDetails}
                onIonInput={(e) => setOtherDetails(e.detail.value!)}
                placeholder="Enter additional details"
                rows={3}
              />
            </IonItem>

            {/* Enhanced Attachments Section */}
            <IonItem>
              <IonLabel>
                <h3>Attachments ({attachments.length})</h3>
              </IonLabel>
              <IonButton
                fill="clear"
                slot="end"
                onClick={handleAddAttachment}
                disabled={isUploading}
              >
                <IonIcon icon={add} />
              </IonButton>
            </IonItem>

            {/* Show upload progress */}
            {isUploading && (
              <IonItem>
                <IonLabel>Processing file...</IonLabel>
                <IonProgressBar type="indeterminate" />
              </IonItem>
            )}

            {/* Enhanced Attachments List */}
            {attachments.length > 0 && (
              <IonCard>
                <IonCardContent>
                  <IonList>
                    {attachments.map((attachment, index) => (
                      <IonItem key={index}>
                        {attachment.type === "image" && attachment.preview ? (
                          <IonThumbnail slot="start">
                            <IonImg
                              src={attachment.preview}
                              alt={attachment.name}
                            />
                          </IonThumbnail>
                        ) : (
                          <IonIcon
                            icon={attachment.type === "pdf" ? document : camera}
                            slot="start"
                            color="primary"
                          />
                        )}

                        <IonLabel>
                          <h3>{attachment.name}</h3>
                          <p>Type: {attachment.type.toUpperCase()}</p>
                          {attachment.size && (
                            <p>Size: {Math.round(attachment.size / 1024)} KB</p>
                          )}
                        </IonLabel>

                        {attachment.status === "uploading" && (
                          <IonProgressBar
                            type="indeterminate"
                            slot="end"
                            style={{ width: "50px" }}
                          />
                        )}

                        {getStatusIcon(attachment.status) && (
                          <IonIcon
                            icon={getStatusIcon(attachment.status)!}
                            color={getStatusColor(attachment.status)}
                            slot="end"
                          />
                        )}

                        {attachment.status === "success" && (
                          <IonButton
                            fill="clear"
                            slot="end"
                            onClick={() => previewAttachment(attachment)}
                          >
                            <IonIcon icon={eye} />
                          </IonButton>
                        )}

                        <IonButton
                          fill="clear"
                          slot="end"
                          onClick={() => removeAttachment(index)}
                          color="danger"
                          disabled={attachment.status === "uploading"}
                        >
                          <IonIcon icon={trash} />
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            )}

            {/* Submit Button */}
            <IonButton
              expand="block"
              onClick={handleSubmit}
              style={{ marginTop: "20px" }}
              disabled={isUploading}
            >
              <IonIcon icon={checkmark} slot="start" />
              {isUploading ? "Saving..." : "Save Record"}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Date Modal */}
        <IonModal
          isOpen={isDateModalOpen}
          onDidDismiss={() => setIsDateModalOpen(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Select Date</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsDateModalOpen(false)}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonDatetime
              value={selectedDate}
              onIonChange={(e) => setSelectedDate(e.detail.value as string)}
              presentation="date"
            />
          </IonContent>
        </IonModal>

        {/* File Preview Modal */}
        <IonModal
          isOpen={isPreviewModalOpen}
          onDidDismiss={() => setIsPreviewModalOpen(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Preview: {previewFile?.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsPreviewModalOpen(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {previewFile && (
              <div style={{ padding: "20px", textAlign: "center" }}>
                {previewFile.type === "image" && previewFile.preview ? (
                  <IonImg src={previewFile.preview} alt={previewFile.name} />
                ) : previewFile.type === "pdf" ? (
                  <div>
                    <IonIcon
                      icon={document}
                      style={{
                        fontSize: "64px",
                        color: "var(--ion-color-primary)",
                      }}
                    />
                    <p>{previewFile.name}</p>
                    <IonButton
                      onClick={() => window.open(previewFile.path, "_blank")}
                    >
                      Open PDF
                    </IonButton>
                  </div>
                ) : (
                  <div>
                    <p>Preview not available for this file type</p>
                    <p>{previewFile.name}</p>
                  </div>
                )}
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Action Sheet for Attachments */}
        <IonActionSheet
          isOpen={isActionSheetOpen}
          onDidDismiss={() => setIsActionSheetOpen(false)}
          buttons={[
            {
              text: "Take Photo",
              icon: camera,
              handler: handleTakePhoto,
            },
            {
              text: "Choose Image",
              icon: attach,
              handler: handlePickImage,
            },
            {
              text: "Choose PDF",
              icon: document,
              handler: handlePickPDF,
            },
            {
              text: "Cancel",
              role: "cancel",
            },
          ]}
        />

        {/* Enhanced Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReceiveTab;
