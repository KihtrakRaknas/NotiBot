import React from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Button} from 'react-native'
import { ListItem } from 'react-native-elements'
import firebase from 'firebase';
import '@firebase/firestore';
import { Notifications } from 'expo';

export default function Settings({navigation}) {
  function signOut(){
    firebase.auth().signOut().then(/*()=>navigation.navigate('Loading')*/).catch((error) => console.error('Sign Out Error', error))
  }

  return (
    <View style={styles.container}>
      <Button title="Sign Out" onPress={signOut}/>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
})