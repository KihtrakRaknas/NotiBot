import React, { useRef, useContext, useLayoutEffect, useEffect } from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native'
import { ListItem, Button, Overlay, Avatar, Header } from 'react-native-elements'
import firebase from 'firebase';
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants';
import WebModal from 'modal-react-native-web';
import hashStringToColor from '../utils/hashStringToColor'
import { LinearGradient } from 'expo-linear-gradient';
import { ProjectsContext, DeepLinkContext, MainStackLoadedContext } from '../utils/contexts'
import { showMessage, hideMessage } from "react-native-flash-message";
import * as Linking from 'expo-linking';
import { useFocusEffect, useLinkTo } from '@react-navigation/native';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';

const prefix = Linking.createURL('/');

export default function Home({ navigation }) {
  const { projectsData, listenToProject, stopListeningToProject } = React.useContext(ProjectsContext);
  // const notificationListener = useRef();
  // const responseListener = useRef();
  const [loading, setLoading] = React.useState(true);
  const [projects, setProjects] = React.useState([]);
  const [numberOfProjects, setNumberOfProjects] = React.useState(null);
  const [visible, setVisible] = React.useState(false);
  const [projectName, setProjectName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const initialDeepLink = useContext(DeepLinkContext)
  const mainStackLoadedRef = useContext(MainStackLoadedContext)
  const linkTo = useLinkTo();

  const currentUserUid = firebase.auth().currentUser.uid;
  const db = firebase.firestore();

  const resetModalState = () => {
    setProjectName('')
    setErrorMessage('')
  }

  async function createNewProject() {
    const valid = await checkProjName()
    if (valid) {
      try{
        await db.collection('Projects').doc(projectName.toUpperCase()).set({
          'Owner': firebase.firestore.FieldValue.arrayUnion(currentUserUid)
        })
        await db.collection('Users').doc(currentUserUid).set({
          'Projects': firebase.firestore.FieldValue.arrayUnion(projectName.toUpperCase())
        }, { merge: true })
        setVisible(false)
      } catch(e) {
        if(e.code == "permission-denied" || e.code == "already-exists"){
          setErrorMessage(`Name already taken: ${projectName}`)
        }
      }
    }
  }

  async function checkProjName() {
    if (projectName.toUpperCase().length < 2) {
      setErrorMessage(`Your name must be at least 2 characters. You only have: ${projectName.length}`)
      return false
    }
    if (!projectName.toUpperCase().match("^[A-Z0-9]+$")){
      setErrorMessage(`Your name must only have letters and numbers (no spaces or special characters)`)
      return false
    }
    return true
  }

  async function registerForPushNotificationsAsync() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
      firebase.firestore().collection('Users').doc(currentUserUid).set({
        'Push Tokens': firebase.firestore.FieldValue.arrayUnion(token)
      }, { merge: true })


    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF00007C',
      });
    }
  };

  async function setNotificationCategories() {
    await Notifications.setNotificationCategoryAsync("standard",[
      {
        identifier:"deleteNotif", 
        buttonTitle: "Delete",
        options: {
          opensAppToForeground:false,
          isAuthenticationRequired:true,
          isDestructive:true
        }
      }
    ],{previewPlaceholder:"NotiBot Notification"})
    await Notifications.setNotificationCategoryAsync("webhookbutton",[
      {
        identifier:"webhookAction", 
        buttonTitle: "Trigger Webhook Action",
        options: {
          opensAppToForeground:true,
          isAuthenticationRequired:true,
          isDestructive:false
        }
      },
      {
        identifier:"deleteNotif", 
        buttonTitle: "Delete",
        options: {
          opensAppToForeground:true,
          isAuthenticationRequired:true,
          isDestructive:true
        }
      }
    ],{previewPlaceholder:"NotiBot Notification With Webhook Action"})
    await Notifications.setNotificationCategoryAsync("webhooktext",[
      {
        identifier:"webhookReply", 
        buttonTitle: "Send Text to Webhook",
        textInput:{
          submitButtonTitle:"SEND",
          placeholder:""
        },
        options: {
          opensAppToForeground:true,
          isAuthenticationRequired:true,
          isDestructive:false
        }
      },
      {
        identifier:"deleteNotif", 
        buttonTitle: "Delete",
        options: {
          opensAppToForeground:true,
          isAuthenticationRequired:true,
          isDestructive:true
        }
      }
    ],{previewPlaceholder:"NotiBot Notification With Webhook Reply"})
  }

  React.useEffect(() => {
    if (Constants.isDevice && Platform.OS !== 'web') { //Expo's support for web push is "pending"
     registerForPushNotificationsAsync().then(setNotificationCategories)
    }
      
  }, [true])


  React.useLayoutEffect(()=>{
    const parsedDeepLink = initialDeepLink?.substring(prefix.length-1)
    if(parsedDeepLink && parsedDeepLink.length>1 && parsedDeepLink[0]=='/') {
      // Moved to a separate effect so it wont get triggers everytime projects changes
      // linkTo(parsedDeepLink)
    }else if(numberOfProjects === projects.length && !mainStackLoadedRef.current.queue && mainStackLoadedRef.current.loaded == false) { // projects have finished downloading
      if(projects.length>0){
        console.log("opening most recent project!")
        navigation.navigate("Project", { title: projects[0].title })
      }
      navigation.openDrawer()
    }
    mainStackLoadedRef.current.mainStackLoaded()
  },[projects, numberOfProjects])

  React.useEffect(()=>{ // handle deep links
    const parsedDeepLink = initialDeepLink?.substring(prefix.length-1)
    if(parsedDeepLink && parsedDeepLink.length>1 && parsedDeepLink[0]=='/')
      linkTo(encodeURI(parsedDeepLink))
  },[true])

  React.useLayoutEffect(() => {
    const subscriptionFunctions = []
    const unsub = firebase.firestore().collection('Users').doc(currentUserUid).onSnapshot({
      includeMetadataChanges: true
    }, (doc) => {
      const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
      if (source == "Server") {
        let data = (doc.data() && doc.data()["Projects"]) ? doc.data()["Projects"] : []
        console.log(doc.data());
        console.log("Current data: " + data);
        for (let projectName of data) {
          if (!projects.some(projectObj=>projectObj.title == projectName)) {
            const subFunc = (data) => {
              setProjects(projects => {
                projects = projects.filter(projectObj=>projectObj.title!=projectName)
                if (data) {
                  projects = [{
                    title: projectName,
                    subtitle: data?.Notifications && data.Notifications.length > 0 ? data.Notifications[data.Notifications.length - 1].title : `No notifications yet!`,
                    timestamp: data?.Notifications && data.Notifications.length > 0 ? data.Notifications[data.Notifications.length - 1].timestamp : 0
                  }, ...projects]
                  console.log(`adding project to array: ${projectName}`)
                }
                projects.sort((a, b) => b?.timestamp - a?.timestamp)
                setLoading(false)
                console.log(`new projects: ${JSON.stringify(projects)}`)
                return projects
              })

            }
            listenToProject(projectName, subFunc, true)
            subscriptionFunctions.push({ projectName, subFunc })
          }
        }
        setNumberOfProjects(data.length)
        if (data.length == 0) {
          setLoading(false)
        }
      }
    });
    return () => {
      for (let { projectName, subFunc } of subscriptionFunctions)
        stopListeningToProject(projectName, subFunc)
      unsub()
    }
  }, []);

  const toggleOverlay = () => {
    resetModalState()
    setVisible(!visible);
  };

  //console.log(`projectsData: ${JSON.stringify(projectsData)}`)
  return (
    <>
      <Overlay isVisible={visible} onBackdropPress={toggleOverlay} ModalComponent={Platform.OS === 'web' ? WebModal : Modal} overlayStyle={[Platform.OS != 'web' ? { width: "80%", margin: "30%", maxWidth: 400 /*,flexGrow:1,flex:1,*/ } : {}, { backgroundColor: "red", borderRadius: 10, bottom: "20%" }]}>
        <View>
          <View style={styles.textInputBox}>
            <TextInput
              placeholder="Project Name"
              placeholderTextColor="white"
              autoCapitalize="none"
              style={styles.textInput}
              onChangeText={setProjectName}
              value={projectName}
            />
          </View>
          {errorMessage != '' &&
            <Text style={styles.errorMessage}>
              {errorMessage}
            </Text>}
          <Button
            title="Create Project"
            onPress={createNewProject}
          />
        </View>
      </Overlay>
      <Header
        backgroundColor="red"
        leftComponent={{ icon: 'plus', type: 'ant-design', color: 'white', onPress: toggleOverlay, size: 23 }}
        centerComponent={{ text: 'Projects', style: { color: 'white', fontSize: 18, fontWeight: "bold" } }}
        rightComponent={{ icon: "settings", type: 'feather', color: 'white', onPress: () => navigation.navigate('Settings'), size: 23 }}
      />
      <LinearGradient colors={["#ff000090", "red"]} start={{ x: 0, y: .6 }} end={{ x: 0, y: 0 }} style={styles.container}>
        {loading && <ActivityIndicator size="large" />}
        {!loading && <>
          <FlatList
            style={{ height: "100%", width: "100%" }}
            data={projects}
            renderItem={({ item }) => {
              console.log(`item: ${JSON.stringify(item)}`)
              return (<ListItem style={{ borderRadius: 20, marginVertical: 5 }} bottomDivider topDivider onPress={() => {
                // navigation.closeDrawer()
                navigation.navigate("Project", { title: item.title })
              }}
                linearGradientProps={{
                  colors: hashStringToColor(item.title),
                  start: { x: 1, y: 0 },
                  end: { x: 0, y: 0 },
                }}
                ViewComponent={LinearGradient}
                containerStyle={{ borderRadius: 20 }}
                >
                <Avatar size="large" rounded title={item.title.substring(0, 2)} />
                <ListItem.Content>
                  <ListItem.Title style={styles.listItemTitle}>{item.title}</ListItem.Title>
                  <ListItem.Subtitle style={styles.listItemSubtitle}>{item.subtitle}</ListItem.Subtitle>
                </ListItem.Content>
                <ListItem.Chevron />
              </ListItem>)
            }}
            keyExtractor={item => item.title}
            ListFooterComponent={Platform.OS == 'web' && <Button title="Open Docs" titleStyle={{textDecorationLine:"underline",color:"white"}} onPress={()=>WebBrowser.openBrowserAsync('https://notibotdocs.kihtrak.com',{controlsColor:'#FF0000',showTitle:true})} type="clear"/>}
            ListEmptyComponent={<View style={{ flex: 1, flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}><Text style={{color:"white"}}>You currently have no projects</Text><Button style={{ marginTop: 10 }} title="Create a new project" onPress={toggleOverlay} /></View>}
          />
        </>}
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: "center",
    paddingTop: 5,
    paddingHorizontal: 5,
  },
  textInputBox: {
    borderBottomColor: "white",
    borderBottomWidth: 1,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  textInput: {
    fontSize: 24,
    height: 40,
    fontWeight: '200',
    marginBottom: 0,
    color: "white",
    textAlign: 'center'
  },
  errorMessage: {
    color: 'blue', marginBottom: 20
  },
  listItemTitle: {
    fontSize: 30,
    fontWeight: "bold"
  },
  listItemSubtitle: {
    //fontSize:20
  }
})