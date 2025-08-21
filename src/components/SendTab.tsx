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
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSelect,
  IonSelectOption,
  IonActionSheet,
  IonIcon,
  IonImg,
  IonToast,
  IonChip,
} from "@ionic/react";
import { camera, attach, checkmark, close, image } from "ionicons/icons";

import { dbService } from "../services/database.service";
import { fileService } from "../services/file.service";
import { Party } from "../types";

const SendTab: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [lrNumber, setLrNumber] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<{
    name: string;
    path: string;
  } | null>(null);

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

  const handleAddImage = () => {
    setIsActionSheetOpen(true);
  };

  const handleTakePhoto = async () => {
    const result = await fileService.takePhoto();
    if (result) {
      setSelectedImage(result);
    }
  };

  const handlePickImage = async () => {
    const result = await fileService.pickImage();
    if (result) {
      setSelectedImage(result);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if (amount <= 0) {
      setToastMessage("Please enter a valid amount");
      setShowToast(true);
      return;
    }

    try {
      const recordData = {
        amount: amount,
        party_name: selectedParty || undefined,
        lr_number: lrNumber || undefined,
        image: selectedImage?.path || undefined,
      };

      await dbService.addSendRecord(recordData);

      // Reset form
      setAmount(0);
      setSelectedParty("");
      setLrNumber("");
      setSelectedImage(null);

      setToastMessage("Send record saved successfully!");
      setShowToast(true);
    } catch (error) {
      console.error("Error saving send record:", error);
      setToastMessage("Error saving record");
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Send</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>New Send Record</IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
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

            {/* Party Selection (Optional) */}
            <IonItem>
              <IonLabel position="stacked">Party (Optional)</IonLabel>
              <IonSelect
                value={selectedParty}
                onIonChange={(e) => setSelectedParty(e.detail.value)}
                placeholder="Choose party"
              >
                <IonSelectOption value="">None</IonSelectOption>
                {parties.map((party) => (
                  <IonSelectOption key={party.id} value={party.name}>
                    {party.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* LR Number (Optional) */}
            <IonItem>
              <IonLabel position="stacked">
                Link to LR Number (Optional)
              </IonLabel>
              <IonInput
                value={lrNumber}
                onIonInput={(e) => setLrNumber(e.detail.value!)}
                placeholder="Enter LR number to link"
                clearInput
              />
            </IonItem>

            {/* Image */}
            <IonItem>
              <IonLabel>
                <h3>Image</h3>
                {selectedImage && (
                  <div style={{ marginTop: "8px" }}>
                    <IonChip color="primary">
                      <IonIcon icon={image} />
                      <IonLabel>{selectedImage.name}</IonLabel>
                      <IonIcon icon={close} onClick={removeImage} />
                    </IonChip>
                  </div>
                )}
              </IonLabel>
              <IonButton fill="clear" slot="end" onClick={handleAddImage}>
                <IonIcon icon={camera} />
              </IonButton>
            </IonItem>

            {/* Submit Button */}
            <IonButton
              expand="block"
              onClick={handleSubmit}
              style={{ marginTop: "20px" }}
            >
              <IonIcon icon={checkmark} slot="start" />
              Save Record
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Action Sheet for Image */}
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
              text: "Cancel",
              role: "cancel",
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

export default SendTab;
