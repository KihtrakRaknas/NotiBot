import React, {useContext, useState} from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native'
import { ListItem, Button, Overlay, Avatar } from 'react-native-elements'
import WebModal from 'modal-react-native-web';
import * as Linking from 'expo-linking';
import { useLinkTo  } from '@react-navigation/native';

import { ProjectsContext, DeepLinkContext } from '../utils/contexts'
import { Alert } from 'react-native';
import Loading from './Loading';
import * as WebBrowser from 'expo-web-browser';
const prefix = Linking.createURL('/');

export default function Project({ navigation, route }){
    const {projectsData, listenToProject, stopListeningToProject} = useContext(ProjectsContext);
    const projTitle = route.params?.title
    const [notifications,updateNotifications] = useState(projectsData?.[projTitle]?.Notifications) //projectsData[projTitle] is guaranteed to exist due to previous screen
    const dimensions = useWindowDimensions();
    const isLargeScreen = dimensions.width >= 768;
    
    React.useEffect(()=>{
      if(projTitle){
        //updateNotifications(projectsData[projTitle].Notifications)
        const handleProjUpdate = (newData)=>{
          if(newData)
            updateNotifications(newData.Notifications)
          else
            // navigation.goBack()
            navigation.openDrawer()
        }
        listenToProject(projTitle,handleProjUpdate, true)
        return ()=>stopListeningToProject(projTitle, handleProjUpdate)
      }
    },[projTitle])

    // React.useEffect(()=>{
    //   if(!projTitle)
    //   navigation.openDrawer()
    // },[navigation, projTitle])

    React.useLayoutEffect(() => {
          navigation.setOptions({...(projTitle?{
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
          }:{title:""}),
          headerLeft:()=>{
            if(isLargeScreen)
              return null
            return(
              <Button
                icon={{
                  name: "menu",
                  type:'entypo',
                  size: 25,
                  color: "white"
                }}
                type="clear"
                onPress={()=>navigation.openDrawer()}
              />
            )
          }
        });
    }, [navigation, projTitle]);


    // console.log(`projectsData: ${JSON.stringify(projectsData)}`)

    const getSubtitle = (item) =>{
        if(item.subtitle)
            return item.subtitle
        if(item.body)
            return item.body
        return ""
    }


    if(!projTitle){
      // if(!isLargeScreen){
      //   navigation.openDrawer()
      //   return(<Loading/>)
      // }
      return(<View style={styles.container}>
        <Text style={{fontSize:15, textAlign:"center"}}>Select a project</Text>
      </View>)
    }

    return (
        <View style={styles.container}>
            <FlatList
            style={{height:"100%",width:"100%"}}
            data={notifications?[...notifications].reverse():[]}
            renderItem={({ item, index }) => <ListItem style={styles.listItem} bottomDivider topDivider onPress={
              ()=>navigation.navigate("Notification",{index: (notifications.length-1-index), timestamp: item.timestamp, projTitle})
            }>
                <ListItem.Content>
                <ListItem.Title>{item.title.substring(0,30)}</ListItem.Title>
                <ListItem.Subtitle>{getSubtitle(item).substring(0,40)}</ListItem.Subtitle>
                <ListItem.Subtitle left>{new Date(item.timestamp).toLocaleString()}</ListItem.Subtitle>
                </ListItem.Content>
                <ListItem.Chevron/>
            </ListItem>}
            keyExtractor={item => item.title+item.timestamp}
            ListEmptyComponent = {
              <View style={{flex:1,flexGrow:1,height:"100%",justifyContent: 'center',alignItems: 'center', padding:20 }}>
                <Text style={{fontSize:15, textAlign:"center",marginVertical:20}}>The project currently has no notifications</Text>

                <Button title="Learn how to send yourself a notification" titleStyle={{textDecorationLine:"underline"}} onPress={()=>WebBrowser.openBrowserAsync('https://notibotdocs.kihtrak.com',{controlsColor:'#FF0000',showTitle:true})} type="clear"/>
              </View>
            }
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