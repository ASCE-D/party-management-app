import React, { useState, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonIcon,
  IonButton,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonToast,
  IonModal,
  IonButtons,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonList,
  IonThumbnail,
  IonImg,
  RefresherEventDetail,
} from "@ionic/react";
import {
  trash,
  create,
  eye,
  download,
  send,
  document,
  camera,
  close,
  checkmark,
  open,
  share,
  image,
} from "ionicons/icons";
import { Share } from "@capacitor/share";
import { dbService } from "../services/database.service";
import { ReceiveRecord, SendRecord, Party } from "../types";
import { Filesystem, Directory } from '@capacitor/filesystem';

type RecordType = "receive" | "send";

const RecordsTab: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<RecordType>("receive");
  const [receiveRecords, setReceiveRecords] = useState<ReceiveRecord[]>([]);
  const [sendRecords, setSendRecords] = useState<SendRecord[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);

  // Alert states
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // In RecordsTab.tsx
  const handleShareImage = async () => {
    if (!previewImage?.url || !previewImage?.name) {
      setToastMessage("Image data is not available to share.");
      setShowToast(true);
      return;
    }

    try {
      // The previewImage.url is a full data URL: "data:image/jpeg;base64,..."
      // We only need the raw base64 part.
      const base64Data = previewImage.url.split(",")[1];
      const fileName = `share_${previewImage.name}`;

      // Write the base64 data to a temporary file in the Cache directory
      // The Cache directory is perfect for temporary data that can be cleared by the OS.
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache, // Use the Cache directory
      });

      // The result.uri is the native file path (e.g., "file:///...")
      // This is what the Share plugin needs.
      await Share.share({
        title: `Image: ${previewImage.name}`,
        text: `View the attached image: ${previewImage.name}`,
        // Use the 'files' array for local files instead of 'url'.
        // This is the modern, recommended way to share local files.
        files: [result.uri],
      });
    } catch (error) {
      // If the writeFile fails or the user cancels the share, it will be caught here.
      console.error("Error sharing file:", error);
      setToastMessage("Could not share the image.");
      setShowToast(true);
    }
  };

  const loadData = async () => {
    try {
      const [receives, sends, partiesList] = await Promise.all([
        dbService.getReceiveRecords(),
        dbService.getSendRecords(),
        dbService.getParties(),
      ]);

      setReceiveRecords(receives);
      setSendRecords(sends);
      setParties(partiesList);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await loadData();
    event.detail.complete();
  };

  const handleView = (record: any) => {
    setViewingRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord({ ...record });
    setIsEditModalOpen(true);
  };

  const handleEditFromView = () => {
    if (viewingRecord) {
      setEditingRecord({ ...viewingRecord });
      setIsViewModalOpen(false);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteFromView = () => {
    if (viewingRecord) {
      setRecordToDelete(viewingRecord);
      setIsViewModalOpen(false);
      setShowDeleteAlert(true);
    }
  };

  const handleDelete = (record: any) => {
    setRecordToDelete(record);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      if (selectedSegment === "receive") {
        await dbService.deleteReceiveRecord(recordToDelete.id);
      } else {
        await dbService.deleteSendRecord(recordToDelete.id);
      }

      await loadData();
      setToastMessage("Record deleted successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error deleting record:", error);
      setToastMessage("Error deleting record");
      setShowToast(true);
    }

    setRecordToDelete(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      if (selectedSegment === "receive") {
        await dbService.updateReceiveRecord(editingRecord.id, editingRecord);
      } else {
        await dbService.updateSendRecord(editingRecord.id, editingRecord);
      }

      await loadData();
      setIsEditModalOpen(false);
      setEditingRecord(null);
      setToastMessage("Record updated successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error updating record:", error);
      setToastMessage("Error updating record");
      setShowToast(true);
    }
  };

  const handleDownloadFile = (file: any) => {
    console.log("Download file:", file);

    // Check if file has the necessary data
    if (!file) {
      setToastMessage("File not found");
      setShowToast(true);
      return;
    }

    const fileName = file.file_name || file.name || "download";

    try {
      // If file has base64 data or blob URL
      if (file.file_data || file.data || file.file_path) {
        const fileData = file.file_data || file.data;

        if (fileData) {
          // Create download link
          const link = window.document.createElement("a");
          link.href = fileData.startsWith("data:")
            ? fileData
            : `data:application/octet-stream;base64,${fileData}`;
          link.download = fileName;
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);

          setToastMessage(`Downloaded ${fileName}`);
        } else if (file.file_path) {
          // If it's a file path, try to open it
          window.open(file.file_path, "_blank");
          setToastMessage(`Opening ${fileName}`);
        }
      } else {
        setToastMessage("File data not available");
      }
    } catch (error) {
      console.error("Download error:", error);
      setToastMessage("Error downloading file");
    }

    setShowToast(true);
  };

  const handleViewFile = async (file: any) => {
    console.log("View file:", file);

    if (!file) {
      setToastMessage("File not found");
      setShowToast(true);
      return;
    }

    const fileType = file.file_type || file.type || "";
    const fileName = file.file_name || file.name || "Unknown file";

    // Get the actual file data - prioritize base64_data from database
    const base64Data = file.base64_data || file.file_data || file.data;

    if (!base64Data) {
      setToastMessage("File data not available");
      setShowToast(true);
      return;
    }

    try {
      let dataUrl = "";

      // Ensure proper data URL format
      if (base64Data.startsWith("data:")) {
        dataUrl = base64Data;
      } else {
        // Determine MIME type
        let mimeType = file.mime_type || "application/octet-stream";

        if (
          fileType.includes("image") ||
          fileType.match(/jpe?g|png|gif|webp/i)
        ) {
          mimeType = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
        } else if (fileType.includes("pdf")) {
          mimeType = "application/pdf";
        }

        dataUrl = `data:${mimeType};base64,${base64Data}`;
      }

      // Handle different file types
      if (fileType.includes("image") || fileType.match(/jpe?g|png|gif|webp/i)) {
        await handleImageView(dataUrl, fileName);
      } else if (fileType.includes("pdf")) {
        await handlePDFView(dataUrl, fileName);
      } else {
        // For other file types, offer download
        await handleDownloadFile(file);
        return;
      }

      setToastMessage(`Opened ${fileName}`);
    } catch (error) {
      console.error("View file error:", error);
      setToastMessage("Error opening file - file may be corrupted");
    }

    setShowToast(true);
  };

  // Separate function for image viewing
  const handleImageView = async (dataUrl: string, fileName: string) => {
    // For mobile devices, use a modal instead of window.open
    if (window.innerWidth <= 768) {
      // Mobile check
      // Set up image modal (you'll need to add modal state)
      setPreviewImage({ url: dataUrl, name: fileName });
      setShowImageModal(true);
    } else {
      // Desktop - open in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
        <html>
          <head><title>${fileName}</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
            <img src="${dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}">
          </body>
        </html>
      `);
        newWindow.document.close();
      }
    }
  };

  // Separate function for PDF viewing
  const handlePDFView = async (dataUrl: string, fileName: string) => {
    try {
      // Convert data URL to blob for better performance
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Clean up blob URL after some time
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

      if (window.innerWidth <= 768) {
        // Mobile - use in-app browser or download
        const link = window.document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.click();
      } else {
        // Desktop - open in new tab
        window.open(blobUrl, "_blank");
      }
    } catch (error) {
      console.error("PDF view error:", error);
      // Fallback to direct data URL
      window.open(dataUrl, "_blank");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return document;
      case "image":
      case "jpg":
      case "jpeg":
      case "png":
        return image;
      default:
        return document;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Records</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Segment */}
        <IonSegment
          value={selectedSegment}
          onIonChange={(e) => setSelectedSegment(e.detail.value as RecordType)}
        >
          <IonSegmentButton value="receive">
            <IonIcon icon={download} />
            <IonLabel>Receive</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="send">
            <IonIcon icon={send} />
            <IonLabel>Send</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Receive Records */}
        {selectedSegment === "receive" && (
          <>
            {receiveRecords.map((record) => (
              <IonItemSliding key={record.id}>
                <IonItem>
                  <IonLabel>
                    <h2>{record.party_name}</h2>
                    <p>LR: {record.lr_number}</p>
                    <p>
                      {formatCurrency(record.amount)} •{" "}
                      {formatDate(record.date)}
                    </p>
                    {record.files && record.files.length > 0 && (
                      <p>📎 {record.files.length} attachment(s)</p>
                    )}
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    slot="end"
                    onClick={() => handleView(record)}
                  >
                    <IonIcon icon={eye} />
                  </IonButton>
                </IonItem>

                <IonItemOptions side="end">
                  <IonItemOption
                    color="primary"
                    onClick={() => handleEdit(record)}
                  >
                    <IonIcon icon={create} />
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    onClick={() => handleDelete(record)}
                  >
                    <IonIcon icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}

            {receiveRecords.length === 0 && (
              <IonCard>
                <IonCardContent>
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--ion-color-medium)",
                    }}
                  >
                    No receive records found
                  </p>
                </IonCardContent>
              </IonCard>
            )}
          </>
        )}

        <IonModal
          isOpen={showImageModal}
          onDidDismiss={() => setShowImageModal(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{previewImage?.name || "Image Preview"}</IonTitle>
              <IonButtons slot="end">
                {/*
          THIS IS THE NEW SHARE BUTTON
        */}
                <IonButton onClick={handleShareImage}>
                  <IonIcon icon={share} slot="icon-only" />
                </IonButton>

                <IonButton onClick={() => setShowImageModal(false)}>
                  <IonIcon icon={close} slot="icon-only" />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent
            className="ion-padding"
            style={{ "--background": "#f4f5f8" }}
          >
            {previewImage?.url && (
              <IonImg
                src={previewImage.url}
                alt={previewImage.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            )}
          </IonContent>
        </IonModal>

        {/* Send Records */}
        {selectedSegment === "send" && (
          <>
            {sendRecords.map((record) => (
              <IonItemSliding key={record.id}>
                <IonItem>
                  <IonLabel>
                    <h2>{formatCurrency(record.amount)}</h2>
                    {record.party_name && <p>Party: {record.party_name}</p>}
                    {record.lr_number && <p>LR: {record.lr_number}</p>}
                    <p>{formatDate(record.created_at)}</p>
                    {record.image && <p>📷 Image attached</p>}
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    slot="end"
                    onClick={() => handleView(record)}
                  >
                    <IonIcon icon={eye} />
                  </IonButton>
                </IonItem>

                <IonItemOptions side="end">
                  <IonItemOption
                    color="primary"
                    onClick={() => handleEdit(record)}
                  >
                    <IonIcon icon={create} />
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    onClick={() => handleDelete(record)}
                  >
                    <IonIcon icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}

            {sendRecords.length === 0 && (
              <IonCard>
                <IonCardContent>
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--ion-color-medium)",
                    }}
                  >
                    No send records found
                  </p>
                </IonCardContent>
              </IonCard>
            )}
          </>
        )}

        {/* Enhanced View Modal */}
        <IonModal
          isOpen={isViewModalOpen}
          onDidDismiss={() => setIsViewModalOpen(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                {selectedSegment === "receive" ? "Receive" : "Send"} Details
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsViewModalOpen(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {viewingRecord && (
              <>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Record Information</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {selectedSegment === "receive" ? (
                      <>
                        <IonItem>
                          <IonLabel>
                            <h3>Party Name</h3>
                            <p>{viewingRecord.party_name}</p>
                          </IonLabel>
                        </IonItem>
                        <IonItem>
                          <IonLabel>
                            <h3>LR Number</h3>
                            <p>{viewingRecord.lr_number}</p>
                          </IonLabel>
                        </IonItem>
                        <IonItem>
                          <IonLabel>
                            <h3>Amount</h3>
                            <p>{formatCurrency(viewingRecord.amount)}</p>
                          </IonLabel>
                        </IonItem>
                        <IonItem>
                          <IonLabel>
                            <h3>Date</h3>
                            <p>{formatDate(viewingRecord.date)}</p>
                          </IonLabel>
                        </IonItem>
                        {viewingRecord.other_details && (
                          <IonItem>
                            <IonLabel>
                              <h3>Other Details</h3>
                              <p>{viewingRecord.other_details}</p>
                            </IonLabel>
                          </IonItem>
                        )}
                      </>
                    ) : (
                      <>
                        <IonItem>
                          <IonLabel>
                            <h3>Amount</h3>
                            <p>{formatCurrency(viewingRecord.amount)}</p>
                          </IonLabel>
                        </IonItem>
                        {viewingRecord.party_name && (
                          <IonItem>
                            <IonLabel>
                              <h3>Party Name</h3>
                              <p>{viewingRecord.party_name}</p>
                            </IonLabel>
                          </IonItem>
                        )}
                        {viewingRecord.lr_number && (
                          <IonItem>
                            <IonLabel>
                              <h3>LR Number</h3>
                              <p>{viewingRecord.lr_number}</p>
                            </IonLabel>
                          </IonItem>
                        )}
                        <IonItem>
                          <IonLabel>
                            <h3>Date</h3>
                            <p>{formatDate(viewingRecord.created_at)}</p>
                          </IonLabel>
                        </IonItem>
                      </>
                    )}
                  </IonCardContent>
                </IonCard>

                {/* Attachments Section for Receive Records */}
                {selectedSegment === "receive" && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>
                        Attachments
                        {viewingRecord.files && viewingRecord.files.length > 0
                          ? ` (${viewingRecord.files.length})`
                          : " (0)"}
                      </IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {/* Debug information - remove in production */}
                      {/* <IonItem>
                        <IonLabel>
                          <p
                            style={{
                              fontSize: "0.8em",
                              color: "var(--ion-color-medium)",
                            }}
                          >
                            Debug: Files -{" "}
                            {viewingRecord.files
                              ? JSON.stringify(viewingRecord.files, null, 2)
                              : "null"}
                          </p>
                        </IonLabel>
                      </IonItem> */}

                      {viewingRecord.files && viewingRecord.files.length > 0 ? (
                        <IonList>
                          {viewingRecord.files.map(
                            (file: any, index: number) => (
                              <IonItem key={file.id || index}>
                                <IonIcon
                                  icon={getFileIcon(file.file_type)}
                                  slot="start"
                                  color="primary"
                                />
                                <IonLabel>
                                  <h3>
                                    {file.file_name || `File ${index + 1}`}
                                  </h3>
                                  <p>
                                    Type:{" "}
                                    {file.file_type?.toUpperCase() || "Unknown"}
                                  </p>
                                  <p>ID: {file.id}</p>
                                  <p>Record ID: {file.record_id}</p>
                                  {file.file_path && (
                                    <p
                                      style={{
                                        fontSize: "0.8em",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      Path: {file.file_path.substring(0, 50)}...
                                    </p>
                                  )}
                                </IonLabel>
                                <IonButton
                                  fill="clear"
                                  slot="end"
                                  onClick={() => handleViewFile(file)}
                                >
                                  <IonIcon icon={eye} />
                                </IonButton>
                                <IonButton
                                  fill="clear"
                                  slot="end"
                                  onClick={() => handleDownloadFile(file)}
                                >
                                  <IonIcon icon={download} />
                                </IonButton>
                                <IonButton
                                  fill="clear"
                                  slot="end"
                                  color="danger"
                                  onClick={() => handleDelete(file)}
                                >
                                  <IonIcon icon={trash} />
                                </IonButton>
                              </IonItem>
                            )
                          )}
                        </IonList>
                      ) : (
                        <IonItem>
                          <IonIcon
                            icon={document}
                            slot="start"
                            color="medium"
                          />
                          <IonLabel>
                            <p style={{ color: "var(--ion-color-medium)" }}>
                              No attachments found for this record
                            </p>
                            <p
                              style={{
                                fontSize: "0.8em",
                                color: "var(--ion-color-medium)",
                              }}
                            >
                              Record ID: {viewingRecord.id}
                            </p>
                          </IonLabel>
                        </IonItem>
                      )}
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Image Section for Send Records */}
                {selectedSegment === "send" && viewingRecord.image && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Attached Image</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonItem>
                        <IonThumbnail slot="start">
                          <IonImg
                            src={viewingRecord.image}
                            alt="Attached image"
                          />
                        </IonThumbnail>
                        <IonLabel>
                          <h3>Receipt Image</h3>
                          <p>Tap to view full size</p>
                        </IonLabel>
                        <IonButton
                          fill="clear"
                          slot="end"
                          onClick={() =>
                            handleViewFile({
                              file_name: "receipt.jpg",
                              file_type: "image",
                              data: viewingRecord.image,
                            })
                          }
                        >
                          <IonIcon icon={open} />
                        </IonButton>
                      </IonItem>
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Action Buttons */}
                <IonCard>
                  <IonCardContent>
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="primary"
                      onClick={handleEditFromView}
                      style={{ marginBottom: "10px" }}
                    >
                      <IonIcon icon={create} slot="start" />
                      Edit Record
                    </IonButton>
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="danger"
                      onClick={handleDeleteFromView}
                    >
                      <IonIcon icon={trash} slot="start" />
                      Delete Record
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </>
            )}
          </IonContent>
        </IonModal>

        {/* Edit Modal */}
        <IonModal
          isOpen={isEditModalOpen}
          onDidDismiss={() => setIsEditModalOpen(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                Edit {selectedSegment === "receive" ? "Receive" : "Send"} Record
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsEditModalOpen(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {editingRecord && (
              <IonCard>
                <IonCardContent>
                  {selectedSegment === "receive" ? (
                    <>
                      <IonItem>
                        <IonLabel position="stacked">Party Name</IonLabel>
                        <IonSelect
                          value={editingRecord.party_name}
                          onIonChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              party_name: e.detail.value,
                            })
                          }
                        >
                          {parties.map((party) => (
                            <IonSelectOption key={party.id} value={party.name}>
                              {party.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">LR Number</IonLabel>
                        <IonInput
                          value={editingRecord.lr_number}
                          onIonInput={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              lr_number: e.detail.value!,
                            })
                          }
                        />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Amount</IonLabel>
                        <IonInput
                          type="number"
                          value={editingRecord.amount}
                          onIonInput={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              amount: parseFloat(e.detail.value!) || 0,
                            })
                          }
                        />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Other Details</IonLabel>
                        <IonTextarea
                          value={editingRecord.other_details || ""}
                          onIonInput={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              other_details: e.detail.value!,
                            })
                          }
                        />
                      </IonItem>
                    </>
                  ) : (
                    <>
                      <IonItem>
                        <IonLabel position="stacked">Amount</IonLabel>
                        <IonInput
                          type="number"
                          value={editingRecord.amount}
                          onIonInput={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              amount: parseFloat(e.detail.value!) || 0,
                            })
                          }
                        />
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">Party Name</IonLabel>
                        <IonSelect
                          value={editingRecord.party_name || ""}
                          onIonChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              party_name: e.detail.value,
                            })
                          }
                        >
                          <IonSelectOption value="">None</IonSelectOption>
                          {parties.map((party) => (
                            <IonSelectOption key={party.id} value={party.name}>
                              {party.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      <IonItem>
                        <IonLabel position="stacked">LR Number</IonLabel>
                        <IonInput
                          value={editingRecord.lr_number || ""}
                          onIonInput={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              lr_number: e.detail.value!,
                            })
                          }
                        />
                      </IonItem>
                    </>
                  )}

                  <IonButton
                    expand="block"
                    onClick={handleSaveEdit}
                    style={{ marginTop: "20px" }}
                  >
                    <IonIcon icon={checkmark} slot="start" />
                    Save Changes
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}
          </IonContent>
        </IonModal>

        {/* Delete Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirm Delete"
          message="Are you sure you want to delete this record?"
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: confirmDelete,
            },
          ]}
        />

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />
      </IonContent>
    </IonPage>
  );
};

export default RecordsTab;
