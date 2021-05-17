import React from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native'
import { ListItem, Button, Overlay, Avatar } from 'react-native-elements'
import WebModal from 'modal-react-native-web';

import { ProjectsContext } from '../utils/contexts'

export default function Home({ navigation, route }){
    const {projectsData, listenToProject, stopListeningToProject} = React.useContext(ProjectsContext);
    const projTitle = route.params.title
    const [notifications,updateNotifications] = React.useState(projectsData[projTitle].Notifications) //projectsData[projTitle] is guaranteed to exist due to previous screen

    React.useEffect(()=>{
      const handleProjUpdate = (newData)=>{
        if(newData)
          updateNotifications(newData.Notifications)
        else
          navigation.goBack()
      }
      listenToProject(projTitle,handleProjUpdate)
      return ()=>stopListeningToProject(projTitle, handleProjUpdate)
    },[])

    React.useLayoutEffect(() => {
        navigation.setOptions({
        title: projTitle,
        headerRight: () => (
            <Button
              icon={{
                name: "ios-options-outline",
                type:'ionicon',
                size: 25,
                color: "white"
              }}
              type="clear"
              onPress={()=>navigation.navigate("ProjectOptions",{title:projTitle})}
            />
          ),
        });
    }, [navigation]);


    // console.log(`projectsData: ${JSON.stringify(projectsData)}`)

    const getSubtitle = (item) =>{
        if(item.subtitle)
            return item.subtitle
        if(item.data)
            return JSON.stringify(item.data)
        return null
    }

    return (
        <View style={styles.container}>
            <FlatList
            style={{height:"100%",width:"100%"}}
            data={notifications}
            renderItem={({ item, index }) => <ListItem style={styles.listItem} bottomDivider topDivider onPress={()=>navigation.navigate("Notification",{index, timestamp: item.timestamp, projTitle})}>
                <ListItem.Content>
                <ListItem.Title>{item.title.substring(0,20)}</ListItem.Title>
                <ListItem.Subtitle>{getSubtitle(item).substring(0,20)}</ListItem.Subtitle>
                <ListItem.Subtitle left>{new Date(item.timestamp).toLocaleString()}</ListItem.Subtitle>
                </ListItem.Content>
                <ListItem.Chevron/>
            </ListItem>}
            keyExtractor={item => item.title+item.timestamp}
            ListEmptyComponent = {<View style={{flex:1,flexGrow:1,justifyContent: 'center',alignItems: 'center', padding:20}}><Text>You currently have no notifications</Text></View>}
            />
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: "center"
  }
})