import React from 'react'
import { StyleSheet, Platform, Image, ScrollView, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, View } from 'react-native'
import { ListItem, Button, Overlay, Avatar, Text } from 'react-native-elements'
import WebModal from 'modal-react-native-web';
import firebase from 'firebase';
import JSONTree from 'react-native-json-tree'

import { ProjectsContext } from '../utils/contexts'
import { groups } from '../utils/constants'

export default function Notification({ navigation, route }){
    const {projectsData, listenToProject, stopListeningToProject} = React.useContext(ProjectsContext);
    const { index, timestamp, projTitle } = route.params
    const [notification,updateNotification] = React.useState(projectsData[projTitle].Notifications[index]) //projectsData[projTitle].Notifications[index] is guaranteed to exist due to previous screen

    const checkCanDelete = () =>{
        const currentUserUid = firebase.auth().currentUser.uid;
        for(let index of [0,1])
            if(projectsData[projTitle][groups[index]].includes(currentUserUid))
                return true
        return false
    }

    const [canDelete,setCanDelete] = React.useState(checkCanDelete())

    const db = firebase.firestore();

    

    React.useEffect(()=>{
        const handleProjUpdate = (newData)=>{
            if(newData && newData.Notifications){
                let newIndex = index
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
        listenToProject(projTitle,handleProjUpdate)
        return ()=>stopListeningToProject(projTitle, handleProjUpdate)
    },[])

    const deleteNotification=async ()=>{
        await db.collection('Projects').doc(projTitle).set({
            'Notifications':firebase.firestore.FieldValue.arrayRemove(notification)
        }, { merge: true })
    }

    React.useLayoutEffect(() => {
        navigation.setOptions({
            title: notification.title,
            headerRight: () => (
                <Button
                    disabled={!canDelete}
                    title="Delete"
                    type="clear"
                    titleStyle={styles.headerButtonTitle}
                    onPress={deleteNotification}
                />
            ),
        });
    }, [navigation, canDelete]);

    return (
        <ScrollView /*contentContainerStyle={styles.container}*/>
            <SafeAreaView>
                <View style={styles.headerView}>
                    <Text h1>{notification.title}</Text>
                </View>
                <View style={{alignItems: "center"}}>
                    <View style={styles.subheaderView}>
                        {notification.subtitle&&<Text style={styles.textMargin} h4 left>{notification.subtitle}</Text>}{notification.timestamp && <Text style={styles.textMargin} right>{`${new Date(notification.timestamp).toLocaleString()}\nEpoch: ${notification.timestamp}`}</Text>}
                    </View>
                </View>
                <View style={styles.dataView}>
                    <JSONTree data={notification.data} />
                    <Text style={styles.textMargin}>{JSON.stringify(notification.data)}</Text>
                </View>
            </SafeAreaView>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //justifyContent: 'center',
  },
  headerView:{
    alignItems: "center",
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
  }
})