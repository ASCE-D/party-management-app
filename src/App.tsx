import { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Menu from './components/Menu';
import SendTab from "./components/SendTab";
import RecordsTab from "./components/RecordsTab";
import { dbService } from "./services/database.service";
import { notificationService } from "./services/notification.service";

// Ionic CSS
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/flex.css";

/* Theme variables */
import "./theme/variables.css";

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);

  const initializeApp = async () => {
    try {
      // Initialize database first
      await dbService.initializeDatabase();
      
      // Initialize notification service
      await notificationService.initialize();
      
      // Get FCM token for push notifications
      const fcmToken = await notificationService.getFCMToken();
      if (fcmToken) {
        console.log("FCM Token received:", fcmToken);
        // TODO: Send this token to your backend server for storing
        // This token is used to send push notifications to this device
      }
      
      setIsDbReady(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setIsDbReady(true); // Continue anyway
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  if (!isDbReady) {
    return <div className="ion-padding">Loading...</div>;
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main">
          <Menu />
          <IonRouterOutlet id="main">
            <Route path="/send" component={SendTab} exact={true} />
            <Route path="/records" component={RecordsTab} exact={true} />
            <Route exact path="/" render={() => <Redirect to="/send" />} />
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;