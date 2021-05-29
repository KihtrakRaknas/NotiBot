import React from 'react'
import { StyleSheet, Platform, Image, ScrollView, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, View, TouchableOpacity } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { ListItem, Button, Overlay, Avatar, Text } from 'react-native-elements'
import WebModal from 'modal-react-native-web';
import firebase from 'firebase';
import JSONTree from 'react-native-json-tree'
import Loading from './Loading'

import { ProjectsContext } from '../utils/contexts'
import { groups } from '../utils/constants'

export default function Notification({ navigation, route }){
    const {projectsData, listenToProject, stopListeningToProject} = React.useContext(ProjectsContext);
    const { index, timestamp, projTitle, resValue } = route.params
    const [notification,updateNotification] = React.useState(projectsData?.[projTitle]?.Notifications?.[index]) //projectsData[projTitle].Notifications[index] is guaranteed to exist due to previous screen
    const [webhookParamValue,setWebhookParamValue] = React.useState('')
    const [webhookRes,setWebhookRes] = React.useState(resValue?resValue:'')

    const checkCanDelete = () =>{
        const currentUserUid = firebase.auth().currentUser.uid;
        for(let index of [0,1])
            if(projectsData?.[projTitle]?.[groups[index]]?.includes(currentUserUid))
                return true
        return false
    }

    const [canDelete,setCanDelete] = React.useState(checkCanDelete())

    const db = firebase.firestore();

    React.useLayoutEffect(()=>{
        // Handle populating the previous state if the notification was opened with deep linking
        const oldState = navigation.dangerouslyGetState()
        console.log("oldState")
        console.log(JSON.stringify(oldState))
        const {routes, index} = oldState
        const prevRoute = routes?.[routes.length-2]
        if(prevRoute?.name == "Project") // ensure that the correct screen came before
            if(!prevRoute.params){ // only manually set params if they don't exist
                prevRoute.params = {title: projTitle}
                console.log("oldState")
                console.log(JSON.stringify(oldState))
                navigation.reset({index, routes})
            }
    },[navigation])

    React.useEffect(()=>{
        const handleProjUpdate = (newData)=>{
            if(newData && newData.Notifications){
                let newIndex = /*index?index:*/newData.Notifications.length
                while(newIndex>-1 && (!newData.Notifications[newIndex] || newData.Notifications[newIndex].timestamp > timestamp))
                    newIndex--
                if(newData.Notifications[newIndex] && newData.Notifications[newIndex].timestamp == timestamp){
                    setCanDelete(checkCanDelete())
                    updateNotification(newData.Notifications[newIndex])
                    navigation.setParams({index: newIndex})
                }else
                    navigation.goBack()
            }else
                navigation.goBack()
        }
        listenToProject(projTitle,handleProjUpdate, true)
        return ()=>stopListeningToProject(projTitle, handleProjUpdate)
    },[projTitle,timestamp])

    const deleteNotification=async ()=>{
        await db.collection('Projects').doc(projTitle).set({
            'Notifications':firebase.firestore.FieldValue.arrayRemove(notification)
        }, { merge: true })
    }

    React.useLayoutEffect(() => {
        navigation.setOptions({
            title: notification?.title,
            headerRight: () => canDelete
                && <Button
                    disabled={!canDelete}
                    icon={{
                        name: "trash-outline",
                        type:'ionicon',
                        size: 25,
                        color: "white"
                    }}
                    type="clear"
                    titleStyle={styles.headerButtonTitle}
                    onPress={deleteNotification}
                />
            ,
        });
    }, [navigation, canDelete, notification]);

    const makeRequest = () => {
        const url = notification.webhook+webhookParamValue
        fetch(url).then(res=>res.text()).then(setWebhookRes).catch(e=>setWebhookRes(e.toString()))
    }

    if(!notification)
        return(<Loading/>)

    return (
        <KeyboardAwareScrollView>
            <ScrollView /*contentContainerStyle={styles.container}*/>
                <SafeAreaView>
                    <View style={styles.headerView}>
                        <Text h1 style={{textAlign:"center"}}>{notification.title}</Text>
                    </View>
                    <View style={{alignItems: "center"}}>
                        <View style={styles.subheaderView}>
                            {notification.subtitle&&<Text style={styles.textMargin} h4 left>{notification.subtitle}</Text>}{notification.timestamp && <Text style={styles.textMargin} right>{`${new Date(notification.timestamp).toLocaleString()}\nEpoch: ${notification.timestamp}`}</Text>}
                        </View>
                    </View>
                    <View style={styles.dataView}>
                        <Text style={[styles.textMargin,{fontSize:25}]}>{notification.body}</Text>
                        {notification.webhook && <Text style={styles.textMargin}>Webhook: {notification.webhook}</Text>}
                    </View>
                    {notification.webhook && <View style={{alignItems: "center"}}>
                        {notification.webhookParam && 
                        <View style={styles.textInputBox}>
                            <TextInput
                                placeholder="URL parameter value"
                                autoCapitalize="none"
                                style={styles.textInput}
                                onChangeText={setWebhookParamValue}
                                value={webhookParamValue}
                            />
                        </View>}
                        <TouchableOpacity 
                            style={[styles.submitButton,{backgroundColor:"green"}]}
                            onPress={makeRequest}
                        >
                            <Text style={{color:"white",fontSize:20,}}>Call {notification.webhook+webhookParamValue} {webhookRes && "Again"}</Text>
                        </TouchableOpacity>
                    </View>}
                    <View style={styles.dataView}>
                        {!!webhookRes && <Text style={styles.textMargin}>Response: {webhookRes}</Text>}
                    </View>
                </SafeAreaView>
            </ScrollView>
        </KeyboardAwareScrollView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //justifyContent: 'center',
  },
  headerView:{
    alignItems: "center",
    margin:10
  },
  subheaderView: {
    flex: 1,
    flexDirection:'row',
    justifyContent: 'space-between'
  },
  textMargin:{
      margin:10,
  },
  headerButtonTitle:{
      color:'white'
  },
  dataView:{
      flex:1,
      flexDirection:'column',
      justifyContent:"flex-start"
  },
  textInputBox: {
    borderBottomColor:"black",
    borderBottomWidth: 1,
    margin:10,
    marginBottom: 40,
    alignSelf: 'stretch',
  },
  textInput: {
    fontSize: 24,
    height: 40,
    fontWeight: '200',
    marginBottom: 0,
    color:"black",
  },
  submitButton:{
    alignItems: 'center',
    padding:15,
    borderRadius:7,
    marginBottom:10,
    margin:7,
    alignSelf: 'stretch',
  },
})