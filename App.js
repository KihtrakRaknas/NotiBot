import React, {useEffect, useRef} from 'react';
import { Button, Text, TextInput, View, useWindowDimensions, Dimensions, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator,   DrawerContentScrollView,  DrawerItemList, } from '@react-navigation/drawer';
import { ProjectsContext, DeepLinkContext, MainStackLoadedContext } from './utils/contexts'
import FlashMessage from "react-native-flash-message";
import { showMessage, hideMessage } from "react-native-flash-message";
import * as Linking from 'expo-linking';
import { useLinkTo  } from '@react-navigation/native';
import Constants from 'expo-constants';
import useRootNavigation from './utils/useRootNavigation'

import Loading from './screens/Loading'
import Login from './screens/Login'
import SignUp from './screens/SignUp'
import Home from './screens/Home'
import Settings from './screens/Settings'
import Project from './screens/Project'
import Notification from './screens/Notification'
import ProjectOptions from './screens/ProjectOptions'

import * as Notifications from 'expo-notifications'

// import 'expo-firestore-offline-persistence'
import firebase from "firebase";
// import 'firebase/firestore'

var firebaseConfig = {
  apiKey: "AIzaSyBc_AtukKnVqdNYRefB-NtZLy5otD8KMvA",
  authDomain: "notibotapp.firebaseapp.com",
  databaseURL: "https://notibotapp.firebaseio.com",
  projectId: "notibotapp",
  storageBucket: "notibotapp.appspot.com",
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (err) {
    // ignore app already initialized error in stack
}
// firebase.firestore().enablePersistence()

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const db = firebase.firestore();

const prefix = Linking.createURL('/');

export default function App() {
  const projectsData = React.useRef({});
  const userData = React.useRef({});
  const callbacks = React.useRef({});
  const listeners = React.useRef({});
  const notificationListener = useRef();
  const responseListener = useRef();
  const mainStackLoadedRef = useRef({
    mainStackLoaded: () =>{
      mainStackLoadedRef.current.loaded = true
      if(mainStackLoadedRef.current.queue)
        mainStackLoadedRef.current.queue()
    },
    loaded:false,
    queue:null
  });
  const [initialDeepLink, setInitialDeepLink] = React.useState(null);
  // don't use hook on web because resizing is a common action and the site shouldn't reload on every resize
  const dimensionWidth = Platform.OS === 'web'?Dimensions.get('window').width:useWindowDimensions().width; 
  const isLargeScreen = dimensionWidth >= 768;
  // const linkTo = useLinkTo();
  const navigation = useRootNavigation();

  const openLinkInApp = (appUrl)=>{
    if(mainStackLoadedRef.current.loaded)
      navigation.linkTo(appUrl)
    else
      mainStackLoadedRef.current.queue = ()=> navigation.linkTo(appUrl)
  }
  
  // Set up notifications
  React.useLayoutEffect(() => {
    // setTimeout(()=>navigation.linkTo(`Main/Projects/Notification?projTitle=testt&timestamp=1621574434297`),5*1000)

    if (Constants.isDevice && Platform.OS !== 'web') { //Expo's support for web push is "pending"
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        const notifContent = notification.request.content
        // console.log(notification)
        showMessage({
          message: notifContent.title,
          description: notifContent.body,
          type: "info",
          hideStatusBar:true,
          onPress: ()=>{
            navigation.linkTo(`/Main/Projects/Notification?projTitle=${notifContent.data?.project}&timestamp=${notifContent.data?.firebaseData?.timestamp}`)
          }
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
        const notifMetaData = response.notification.request.content.data
        if (response.actionIdentifier == "deleteNotif"){
          // Alert.alert("delete")
          return db.collection('Projects').doc(notifMetaData?.project).set({
            'Notifications':firebase.firestore.FieldValue.arrayRemove(notifMetaData?.firebaseData)
          }, { merge: true })
        }
        let url = ""
        if(response.actionIdentifier == "webhookAction"){
          url = notifMetaData?.firebaseData?.webhook
        }else if(response.actionIdentifier == "webhookReply"){
          url = notifMetaData?.firebaseData?.webhook + response?.userText
        }else{ // response.actionIdentifier == Notifications.DEFAULT_ACTION_IDENTIFIER
          return openLinkInApp(encodeURI(`Main/Projects/Notification?projTitle=${notifMetaData?.project}&timestamp=${notifMetaData?.firebaseData?.timestamp}`))
        }
        const fetchCallback = (resStr, errored) =>{
          showMessage({
            message: errored?"Webhook call failed!":"Webhook called!",
            type: errored?"danger":"success",
            hideStatusBar:true,
          });
          openLinkInApp(encodeURI(`Main/Projects/Notification?projTitle=${notifMetaData?.project}&timestamp=${notifMetaData?.firebaseData?.timestamp}&resValue=${resStr}`))
        }
        fetch(url).then(res=>res.text())
        .then(fetchCallback)
        .catch((e)=>fetchCallback(e.toString(), true))
      });
    }
       //else {
      //alert('Must use physical device for Push Notifications');
      //}
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [true])

  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'SIGN_IN':
          return {
            ...prevState,
            isLoading: false,
            isSignedIn: action.isSignedIn,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isLoading: false,
            isSignedIn: false,
          };
      }
    },
    {
      isLoading: true,
      isSignedIn: false,
    }
  );

  React.useLayoutEffect(()=>{
    Linking.getInitialURL().then((url) => {
      setInitialDeepLink(url)
    });
  },[true])


  React.useLayoutEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      console.log(`Auth: ${!!user}`)
      dispatch({ type: 'SIGN_IN', isSignedIn: !!user });
    })
  }, []);

  //const projectsData = {}

  const projContext = {
    projectsData: projectsData.current,
    listenToProject: (projectName, callback, callOnInit)=>{
      // console.log(JSON.stringify(callbacks.current))
      if(callbacks.current[projectName]){
        console.log(`listener already exists for ${projectName}`)
        callbacks.current[projectName].push(callback)
        if(callOnInit && projectName in projectsData.current)
          callback(projectsData.current[projectName])
      }else{
        console.log(`creating listener for ${projectName}`)
        callbacks.current[projectName] = [callback]
        listeners.current[projectName] = db.collection('Projects').doc(projectName).onSnapshot({
          includeMetadataChanges: true
        },(doc) => {
          const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
          // console.log(source)
          if(source == "Server"){
            // console.log(`Snapshot: ${projectName} - ${doc.data()}`)
            projectsData.current[projectName] = doc.data()
            for(let invCallback of callbacks.current[projectName])
              invCallback(doc.data())
          }
        },
        error=>{
          // console.warn(error)
          projectsData.current[projectName] = null
          for(let invCallback of callbacks.current[projectName])
            invCallback(null)
        }
        )
      }
    },
    stopListeningToProject: (projectName, callback)=>{
      // console.log(`Stopping listener - ${projectName}:${callback}\n${callbacks.current[projectName]}`)
      if(!callbacks.current[projectName]){
        console.warn("Listener doesn't exist. How did this happen?")
      }
      const index = callbacks.current[projectName].indexOf(callback)
      console.log(`Index of callback in array: ${index}`)
      callbacks.current[projectName].splice(index,1)
      if(callbacks.current[projectName].length == 0){
        callbacks.current[projectName] = null
        listeners.current[projectName]();
      }
    }
  }

  const ProjectStack = () => {
    return (<Stack.Navigator 
      screenOptions={{
        headerStyle: {
          backgroundColor: 'red',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Project" component={Project}/>
      <Stack.Screen name="ProjectOptions" component={ProjectOptions} />
      <Stack.Screen name="Notification" component={Notification} />
    </Stack.Navigator>)
  }

  const DrawerNav = ()=> {
    return(<Drawer.Navigator
      // openByDefault
      drawerType={isLargeScreen ? 'permanent' : 'back'}
      drawerStyle={isLargeScreen ? null : { width: '100%' }}
      overlayColor="transparent"
      drawerContent={(props) => {
        return (<Home {...props} />)
      }}
      screenOptions={{
        gestureEnabled:true
      }}
    >
      <Drawer.Screen name="Projects" component={ProjectStack}/>
    </Drawer.Navigator>)
  }

  return (<NavigationContainer ref={navigation.navigationRef} linking={{
    prefixes: [prefix, 'http://localhost:19006', 'https://notibot.kihtrak.com'],
    screens: {
      ProjectsDrawerScreen:{
        path: '',
        screens: {
          Projects:{
            path: '',
            screens: {
              Project: 'project/:title',
              Notification: 'notification/:projTitle/:timestamp/:resValue?/:index?',
            }
          }
        },
      },
    },
    subscribe(listener) {
      const onReceiveURL = ({ url }) => {
        listener(url)
        console.log(`setInitialDeepLink(${url})`)
        if(url!=initialDeepLink)
          setInitialDeepLink(url)
      };

      // Linking.getInitialURL().then((url) => {
      //   console.log(`setInitialDeepLinkbyutnotreally(${url})`)
      // });

      // Listen to incoming links from deep linking
      Linking.addEventListener('url', onReceiveURL);

      return () => {
        // Clean up the event listeners
        Linking.removeEventListener('url', onReceiveURL);
      };
    },
  }}>
    <MainStackLoadedContext.Provider value={mainStackLoadedRef}>
      <DeepLinkContext.Provider value={initialDeepLink}>
        <ProjectsContext.Provider value={projContext}>
            <Stack.Navigator 
              screenOptions={{
                headerStyle: {
                  backgroundColor: 'red',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {state.isLoading ? ( 
                <Stack.Screen name="Splash" component={Loading} options={{ headerShown:false }}/>
              ) : state.isSignedIn == false ? <>
                 <Stack.Screen
                  name="SignIn"
                  component={Login}
                  options={{
                    headerShown:false,
                // When logging out, a pop animation feels intuitive
                    animationTypeForReplace: !state.isSignedIn ? 'pop' : 'push',
                  }}
                />
                <Stack.Screen
                  name="SignUp"
                  component={SignUp}
                  options={{
                    headerShown:false,
                // When logging out, a pop animation feels intuitive
                    animationTypeForReplace: !state.isSignedIn ? 'pop' : 'push',
                  }}
                />
                </> : <><Stack.Screen name="Main" component={DrawerNav} options={{ headerShown:false }}/>
                  <Stack.Screen name="Settings" component={Settings} />
                {/* <Stack.Screen name="Projects" component={Home} /> */}
              
                {/* <Stack.Screen name="ProjectOptions" component={ProjectOptions} />
                <Stack.Screen name="Notification" component={Notification} />
                <Stack.Screen name="Settings" component={Settings} /> */}
              </>}
            </Stack.Navigator>
          </ProjectsContext.Provider>
        </DeepLinkContext.Provider>
      </MainStackLoadedContext.Provider>
      <FlashMessage position="top" />
    </NavigationContainer>
  );
}
