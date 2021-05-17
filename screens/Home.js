import React from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native'
import { ListItem, Button, Overlay, Avatar } from 'react-native-elements'
import firebase from 'firebase';
import * as Notifications from 'expo-notifications'
import * as Permissions from 'expo-permissions';
import Constants from 'expo-constants';
import WebModal from 'modal-react-native-web';

import { ProjectsContext } from '../utils/contexts'

export default function Home({ navigation }){
  const {projectsData, listenToProject, stopListeningToProject} = React.useContext(ProjectsContext);

  const [loading, setLoading] = React.useState(true);
  const [projects, setProjects] = React.useState([]);
  const [visible, setVisible] = React.useState(false);
  const [projectName, setProjectName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  
  const currentUserUid = firebase.auth().currentUser.uid;
  const db = firebase.firestore();

  const resetModalState = () =>{
    setProjectName('')
    setErrorMessage('')
  }

  async function createNewProject(){
    const valid = await checkProjName()
    if(valid){
      await db.collection('Projects').doc(projectName).set({
        'Owner':firebase.firestore.FieldValue.arrayUnion(currentUserUid)
      })
      await db.collection('Users').doc(currentUserUid).set({
        'Projects':firebase.firestore.FieldValue.arrayUnion(projectName)
      }, { merge: true })
      setVisible(false)
    }
  }

  async function checkProjName(){
    if(projectName.length<5){
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          onPress={toggleOverlay}
          icon={{
            name: "plus",
            type:'ant-design',
            size: 25,
            color: "white"
          }}
          type="clear"
        />
      ),
      headerLeft: () => (
        <Button
          onPress={()=>navigation.navigate('Settings')}
          icon={{
            name: "settings",
            type:'feather',
            size: 25,
            color: "white"
          }}  
          type="clear"
        />
      ),
    });
  }, [navigation]);

  async function registerForPushNotificationsAsync(){
    if (Constants.isDevice && Platform.OS !== 'web') {
      const { status: existingStatus } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
      firebase.firestore().collection('Users').doc(currentUserUid).set({
        'Push Tokens':firebase.firestore.FieldValue.arrayUnion(token)
      }, { merge: true })
    } else {
      //alert('Must use physical device for Push Notifications');
    }
  
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  React.useEffect(()=>{
    registerForPushNotificationsAsync()
  },[])
  
  React.useLayoutEffect(() => {
    const subscriptionFunctions = []
    const unsub = firebase.firestore().collection('Users').doc(currentUserUid).onSnapshot({
          includeMetadataChanges: true
      },(doc) => {
      const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
      if(source == "Server"){
        let data = (doc.data()&&doc.data()["Projects"])?doc.data()["Projects"]:[]
        console.log(doc.data());
        console.log("Current data: " + data);
        for(let projectName of data){
          if(!projects.includes(projectName)){
            const subFunc = (data) => {
              projects.splice(projects.indexOf(projectName),1)
              //console.log(`projectsData: ${projectName} - ${JSON.stringify(projectsData)}`)
              // if(loading)
                setLoading(false)
              setProjects(data?[projectName, ...projects]:projects)
            }
            listenToProject(projectName, subFunc)
            subscriptionFunctions.push({projectName,subFunc})
          }
        }
        if(data.length==0){
          setLoading(false)
        }
      }
    });
    return ()=>{
      for(let {projectName, subFunc} of subscriptionFunctions)
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
      <Overlay isVisible={visible} onBackdropPress={toggleOverlay} ModalComponent={Platform.OS === 'web'?WebModal:Modal} overlayStyle={[Platform.OS!='web'?{width:"80%", margin:"30%", maxWidth:400 /*,flexGrow:1,flex:1,*/}:{},{ backgroundColor:"red", borderRadius:10, bottom:"20%"}]}>
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
          {errorMessage!='' && 
          <Text style={styles.errorMessage}>
            {errorMessage}
          </Text>} 
          <Button
            title="Create Project"
            onPress={createNewProject}
          />
        </View>
      </Overlay>
      <View style={styles.container}>
        {loading && <ActivityIndicator size="large"/>}
        {!loading && <FlatList
          style={{height:"100%",width:"100%"}}
          data={projects}
          renderItem={({ item }) => {
            console.log(`item: ${item}`)
            // console.log(projectsData)
            // console.log(projectsData[item])
            if(!projectsData[item]){
              console.warn(`Trying to render a project that doesn't exist` + `item: ${item}`)
              return null
            }
            return(<ListItem style={styles.listItem} bottomDivider topDivider onPress={()=>navigation.navigate("Project",{title:item})}>
              <Avatar size="large" rounded title={item.substring(0,2)}/>
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>{item}</ListItem.Title>
                <ListItem.Subtitle style={styles.listItemSubtitle}>{projectsData[item].Notifications&&projectsData[item].Notifications.length>0?projectsData[item].Notifications[projectsData[item].Notifications.length-1].title:`No notifications yet!`}</ListItem.Subtitle>
              </ListItem.Content>
              <ListItem.Chevron/>
            </ListItem>)
          }}
          keyExtractor={item => item}
          ListEmptyComponent = {<View style={{flex:1,flexGrow:1,justifyContent: 'center',alignItems: 'center', padding:20}}><Text>You currently have no projects</Text><Button style={{marginTop:10}} title="Create a new project" onPress={toggleOverlay}/></View>}
        />}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: "center"
  },
  textInputBox: {
    borderBottomColor:"white",
    borderBottomWidth: 1,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  textInput: {
    fontSize: 24,
    height: 40,
    fontWeight: '200',
    marginBottom: 0,
    color:"white",
    textAlign:'center'
  },
  errorMessage:{
    color: 'blue', marginBottom:20
  },
  listItemTitle:{
    fontSize:30,
    fontWeight:"bold"
  },
  listItemSubtitle:{
    //fontSize:20
  }
})