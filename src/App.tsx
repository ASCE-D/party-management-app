import React, { useEffect, useState } from "react";
import {
  IonApp,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonTab,
  setupIonicReact,
  IonSpinner,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route } from "react-router-dom";
import { send, download, list } from "ionicons/icons";

import ReceiveTab from "./components/ReceiveTab";
import SendTab from "./components/SendTab";
import RecordsTab from "./components/RecordsTab";
import { dbService } from "./services/database.service";

// Ionic CSS
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

setupIonicReact();

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);
  const initializeApp = async () => {
    try {
      await dbService.initializeDatabase();

      // Optional: Register for web push notifications using Firebase Cloud Messaging.
      // Replace with a real user identifier from your auth/session system.
      const userId = "demo-user";

      try {
        const { registerForPushNotifications, listenForForegroundMessages } =
          await import("./services/notifications.service");
        await registerForPushNotifications({
          userId,
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
          registerTokenEndpoint: import.meta.env
            .VITE_REGISTER_DEVICE_TOKEN_ENDPOINT as string,
        });

        listenForForegroundMessages((payload) => {
          // You can wire this into your UI/toast system.
          // eslint-disable-next-line no-console
          console.log("FCM foreground message:", payload);
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Push registration skipped/failed:", e);
      }

      setIsDbReady(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
    }
  };

  if (!isDbReady) {
    return (
      <IonApp>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
          }}
        >
          <IonSpinner name="crescent" />
          <p>Initializing Database...</p>
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/receive">
              <ReceiveTab />
            </Route>
            <Route exact path="/send">
              <SendTab />
            </Route>
            <Route exact path="/records">
              <RecordsTab />
            </Route>
            <Route exact path="/">
              <ReceiveTab />
            </Route>
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            <IonTabButton tab="receive" href="/receive">
              <IonIcon icon={download} />
              <IonLabel>Receive</IonLabel>
            </IonTabButton>

            <IonTabButton tab="send" href="/send">
              <IonIcon icon={send} />
              <IonLabel>Send</IonLabel>
            </IonTabButton>

            <IonTabButton tab="records" href="/records">
              <IonIcon icon={list} />
              <IonLabel>Records</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;