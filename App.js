import React from 'react';
import { AsyncStorage, Button, Text, TextInput, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ProjectsContext } from './utils/contexts'

import Loading from './screens/Loading'
import Login from './screens/Login'
import SignUp from './screens/SignUp'
import Home from './screens/Home'
import Settings from './screens/Settings'
import Project from './screens/Project'
import Notification from './screens/Notification'
import ProjectOptions from './screens/ProjectOptions'

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

firebase.initializeApp(firebaseConfig);
// firebase.firestore().enablePersistence()

const Stack = createStackNavigator();
const db = firebase.firestore();

export default function App({ navigation }) {
  const projectsData = React.useRef({});
  const userData = React.useRef({});
  const callbacks = React.useRef({});
  const listeners = React.useRef({});

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
      if(callbacks.current[projectName]){
        callbacks.current[projectName].push(callback)
        if(callOnInit)
          callback(projectsData.current[projectName])
      }else{
        callbacks.current[projectName] = [callback]
        listeners.current[projectName] = db.collection('Projects').doc(projectName).onSnapshot({
          includeMetadataChanges: true
        },(doc) => {
          const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
          console.log(source)
          if(source == "Server"){
            console.log(`Snapshot: ${projectName} - ${doc.data()}`)
            projectsData.current[projectName] = doc.data()
            for(let invCallback of callbacks.current[projectName])
              invCallback(doc.data())
          }
        })
      }
    },
    stopListeningToProject: (projectName, callback)=>{
      console.log(`Stopping listener - ${projectName}:${callback}\n${callbacks.current[projectName]}`)
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

  return (<NavigationContainer>
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
            
          </> : <>
            <Stack.Screen name="Projects" component={Home} />
            <Stack.Screen name="Project" component={Project} />
            <Stack.Screen name="ProjectOptions" component={ProjectOptions} />
            <Stack.Screen name="Notification" component={Notification} />
            <Stack.Screen name="Settings" component={Settings} />
          </>}
        </Stack.Navigator>
      </ProjectsContext.Provider>
    </NavigationContainer>
  );
}
