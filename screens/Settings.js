import React from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Alert} from 'react-native'
import { ListItem, Button } from 'react-native-elements'
import firebase from 'firebase';
import '@firebase/firestore';
import * as Notifications from 'expo-notifications'

export default function Settings({navigation}) {
  const [token, setToken] = React.useState("No token");
  const [showToken, setShowToken] = React.useState(false);

  React.useEffect(() => {
    Notifications.getExpoPushTokenAsync().then(res=>{setToken(res.data)}).catch(e=>setToken(e.message))
  }, []);

  function signOut(){
    firebase.auth().signOut().then().catch((error) => console.error('Sign Out Error', error))
  }

  function deleteAccount(){
    firebase.auth().currentUser.getIdToken(true)
      .then((idToken) => fetch("https://noti.kihtrak.com/deleteProfile", { 
        body: JSON.stringify({ idToken }), 
        method: 'POST', 
        headers: { "Content-Type": "application/json" } 
      }))
      .then((res) => res.json())
      .then((resJSON) => {
        const err = resJSON?.error
        if(err)
          Alert.alert(err)
        if(resJSON?.status == 'success')
            signOut()
      })
      .catch(e => Alert.alert(`An error occurred while attempting delete your account`))
  }

  return (
    <View style={styles.container}>
      {/* <Button title="test" onPress={()=>firebase.auth().currentUser.updateProfile({displayName: "Demo",photoURL: "https://images-na.ssl-images-amazon.com/images/I/51zLZbEVSTL._AC_SL1200_.jpg"})} /> */}
      <Button 
        buttonStyle={styles.dangerButton} 
        title="Sign Out" 
        onPress={signOut}
      />
      <Button 
        buttonStyle={styles.dangerButton}
        title="Delete Account" 
        onPress={deleteAccount}
        containerStyle={{ marginTop: 20, }}
      />
      {!showToken && <Button 
        buttonStyle={styles.infoButton}
        title="Show Debug info" 
        onPress={()=>setShowToken(true)}
        containerStyle={{ marginTop: 20, }}
      />}
      {showToken && <Text style={{ marginTop: 40 }}>You token for debugging is: {token}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dangerButton: {
    backgroundColor: "red"
  },
  infoButton: {
    backgroundColor: "teal"
  },
})