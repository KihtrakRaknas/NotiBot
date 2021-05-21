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
import { useLinkTo  } from '@react-navigation/native';
import { Alert } from 'react-native';

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

  const currentUserUid = firebase.auth().currentUser.uid;
  const db = firebase.firestore();

  const resetModalState = () => {
    setProjectName('')
    setErrorMessage('')
  }

  async function createNewProject() {
    const valid = await checkProjName()
    if (valid) {
      await db.collection('Projects').doc(projectName).set({
        'Owner': firebase.firestore.FieldValue.arrayUnion(currentUserUid)
      })
      await db.collection('Users').doc(currentUserUid).set({
        'Projects': firebase.firestore.FieldValue.arrayUnion(projectName)
      }, { merge: true })
      setVisible(false)
    }
  }

  async function checkProjName() {
    if (projectName.length < 5) {
      setErrorMessage(`Your name must be at least 5 characters. You only have: ${projectName.length}`)
      return false
    }
    const doc = await db.collection('Projects').doc(projectName).get({ source: 'server' });
    if (doc.exists) {
      setErrorMessage(`Name already used: ${projectName}`)
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

  React.useEffect(() => {
    if (Constants.isDevice && Platform.OS !== 'web') { //Expo's support for web push is "pending"
     registerForPushNotificationsAsync()
    }
  }, [true])

  // Set up notifications
  // React.useEffect(() => {
  //   if (Constants.isDevice && Platform.OS !== 'web') { //Expo's support for web push is "pending"
  //     registerForPushNotificationsAsync()
  //     notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
  //       // console.log(notification)
  //       const notifContent = notification.request.content
  //       showMessage({
  //         message: notifContent.title,
  //         description: notifContent.body,
  //         type: "info",
  //         onPress: ()=>linkTo(`/Main/Projects/Notification?projTitle=${notifContent.data?.project}&timestamp=${notifContent.data?.timestamp}`)
  //       });
  //     });

  //     responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
  //       const notifMetaData = response.notification.request.content.data
  //       console.log(notifMetaData?.project)
  //       console.log(notifMetaData?.timestamp)
  //       console.log(response.actionIdentifier)
  //       Alert.alert(response.actionIdentifier)
  //       if (response.actionIdentifier == "deleteNotif"){
  //         Alert.alert("delete")
  //         fetch("https://notibot.kihtrak.com/?project=testt&body=test Body Yeet&title=fetch made")
  //         console.log("whoa")
  //       }else{ // response.actionIdentifier == Notifications.DEFAULT_ACTION_IDENTIFIER
  //         Alert.alert("jump to notif")
  //         linkTo(`/Main/Projects/Notification?projTitle=${notifMetaData?.project}&timestamp=${notifMetaData?.timestamp}`)
  //       }
  //     });

  //     Notifications.setNotificationCategoryAsync("standard",[
  //       {
  //         identifier:"deleteNotif", 
  //         buttonTitle: "Delete",
  //         options: {
  //           opensAppToForeground:false,
  //           isAuthenticationRequired:true,
  //           isDestructive:true
  //         }
  //       }
  //     ],{previewPlaceholder:"NotiBot Notification"})
  //     Notifications.setNotificationCategoryAsync("webhookbutton",[
  //       {
  //         identifier:"webhookAction", 
  //         buttonTitle: "Trigger Webhook Action",
  //         options: {
  //           opensAppToForeground:true,
  //           isAuthenticationRequired:true,
  //           isDestructive:false
  //         }
  //       },
  //       {
  //         identifier:"deleteNotif", 
  //         buttonTitle: "Delete",
  //         options: {
  //           opensAppToForeground:true,
  //           isAuthenticationRequired:true,
  //           isDestructive:true
  //         }
  //       }
  //     ],{previewPlaceholder:"NotiBot Notification With Webhook Action"})
  //     Notifications.setNotificationCategoryAsync("webhooktext",[
  //       {
  //         identifier:"webhookReply", 
  //         buttonTitle: "Send Text to Webhook",
  //         textInput:{
  //           submitButtonTitle:"send",
  //           placeholder:""
  //         },
  //         options: {
  //           opensAppToForeground:true,
  //           isAuthenticationRequired:true,
  //           isDestructive:false
  //         }
  //       },
  //       {
  //         identifier:"deleteNotif", 
  //         buttonTitle: "Delete",
  //         options: {
  //           opensAppToForeground:true,
  //           isAuthenticationRequired:true,
  //           isDestructive:true
  //         }
  //       }
  //     ],{previewPlaceholder:"NotiBot Notification With Webhook Reply"})
  //   } //else {
  //     //alert('Must use physical device for Push Notifications');
  //     //}
  //   return () => {
  //     Notifications.removeNotificationSubscription(notificationListener.current);
  //     Notifications.removeNotificationSubscription(responseListener.current);
  //   };
  // }, [true])

  const getTimeStamp = (item) => projectsData[item].Notifications && projectsData[item].Notifications.length > 0 ? projectsData[item].Notifications[projectsData[item].Notifications.length - 1].timestamp : 0

  React.useLayoutEffect(()=>{
    const parsedDeepLink = initialDeepLink?.substring(prefix.length-1)
    if(numberOfProjects == projects.length && projects.length>0 && !(parsedDeepLink && parsedDeepLink.length>1) && !mainStackLoadedRef.current.queue) { // projects have finished downloading
      console.log("opening most recent project!")
      navigation.navigate("Project", { title: projects[0] })
      navigation.openDrawer()
    }
    mainStackLoadedRef.current.mainStackLoaded()
  },[projects, numberOfProjects])

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
          if (!projects.includes(projectName)) {
            const subFunc = (data) => {
              setProjects(projects => {
                if (projects.indexOf(projectName) == -1) {
                  projects = [projectName, ...projects]
                  console.log(`adding project to array: ${projectName}`)
                }
                projects.sort((a, b) => getTimeStamp(b) - getTimeStamp(a))
                setLoading(false)
                console.log(projects)
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
      <LinearGradient colors={["#ff000000", "red"]} start={{ x: 0, y: .6 }} end={{ x: 0, y: 0 }} style={styles.container}>
        {loading && <ActivityIndicator size="large" />}
        {!loading && <FlatList
          style={{ height: "100%", width: "100%" }}
          data={projects}
          renderItem={({ item }) => {
            console.log(`item: ${item}`)
            // console.log(projectsData)
            // console.log(projectsData[item])
            if (!projectsData[item]) {
              console.warn(`Trying to render a project that doesn't exist` + `item: ${item}`)
              return null
            }
            return (<ListItem style={{ borderRadius: 20, marginVertical: 5 }} bottomDivider topDivider onPress={() => {
              // navigation.closeDrawer()
              navigation.navigate("Project", { title: item })
            }}
              linearGradientProps={{
                colors: hashStringToColor(item),
                start: { x: 1, y: 0 },
                end: { x: 0, y: 0 },
              }}
              ViewComponent={LinearGradient}
              containerStyle={{ borderRadius: 20 }}
              >
              <Avatar size="large" rounded title={item.substring(0, 2)} />
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>{item}</ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>{projectsData[item].Notifications && projectsData[item].Notifications.length > 0 ? projectsData[item].Notifications[projectsData[item].Notifications.length - 1].title : `No notifications yet!`}</ListItem.Subtitle>
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>)
          }}
          keyExtractor={item => item}
          ListEmptyComponent={<View style={{ flex: 1, flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}><Text>You currently have no projects</Text><Button style={{ marginTop: 10 }} title="Create a new project" onPress={toggleOverlay} /></View>}
        />}
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