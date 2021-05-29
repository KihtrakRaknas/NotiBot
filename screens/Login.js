import React from 'react';
import { StyleSheet, Text, TextInput, View, Alert, KeyboardAvoidingView, TouchableOpacity, SafeAreaView, Platform} from 'react-native'
import firebase from 'firebase';
import * as Google from 'expo-auth-session/providers/google';
// import * as Google from 'expo-google-app-auth';
import * as GoogleSignIn from 'expo-google-sign-in';
import { SocialIcon } from 'react-native-elements';
import * as WebBrowser from 'expo-web-browser';
import { Button } from 'react-native-elements';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
WebBrowser.maybeCompleteAuthSession();

export default function Login({ navigation }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState(null);
  
  React.useEffect(()=>SplashScreen.hideAsync(),[true])

  function handleLogin() {
    firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((user) => {
      //if(checkUserFeilds(doc.data()))
        //navigation.navigate('LoggedIn')
      // else
      //   navigation.navigate('SetUp')
    })
    .catch(error => {
      if(error.message.includes("The user may have been deleted"))
        error.message = error.message.substring(0,error.message.indexOf("The user may have been deleted"))
      Alert.alert(error.message)
      setErrorMessage(error.message)
    })
  }  

  React.useEffect(() => {
    if(Platform.OS == 'android'){
      WebBrowser.warmUpAsync();
      
      return () => {
        WebBrowser.coolDownAsync();
      };
    }
    if(Constants.appOwnership == "standalone"){ // init native sign in with google logic

      GoogleSignIn.initAsync({
        // You may ommit the clientId when the firebase `googleServicesFile` is configured
        // clientId: '<YOUR_IOS_CLIENT_ID>',
        // Provide other custom options...
      }).catch (({ message }) => {
        Alert.alert('GoogleSignIn.initAsync(): ' + message);
      })
    }

  }, []);

  // const config = {
  //   //
  //   //androidClientId:"",
  //   iosClientId: "896187396809-2ks3dj1dogegfsc8a9jr32s33tt4rben.apps.googleusercontent.com",
  //   androidClientId: "896187396809-tn8u9tp3thnvv07njp6ik46j8ot6k6lc.apps.googleusercontent.com"
  // }

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      expoClientId: '896187396809-tn4obhk9l23t5u8uhmrspmn89iph7lr0.apps.googleusercontent.com',
      webClientId: '896187396809-5tbhq093deljombkbflt9c5mrfu7qvum.apps.googleusercontent.com',
      // clientId: '896187396809-89ltb58u1or8fnetjgn90btpmb4ghmaq.apps.googleusercontent.com',
      androidClientId: '896187396809-i55h6jach0jrja5studqj9dr2iiuhf8a.apps.googleusercontent.com',
      iosClientId: "896187396809-2ks3dj1dogegfsc8a9jr32s33tt4rben.apps.googleusercontent.com",
    },
  );

  React.useEffect(() => {
    console.log("response: ")
    console.log(response)
    if (response?.type === 'success') {
      const { id_token } = response.params;
      console.log(id_token)
      const credential = firebase.auth.GoogleAuthProvider.credential(id_token);
      firebase.auth().signInWithCredential(credential).catch((error) => {
        console.log(error)
        Alert.alert(error.message)
      });
    }
  }, [response]);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.title}>Login</Text>
        {errorMessage &&
        <Text style={styles.errorMessage}>
            {errorMessage}
        </Text>} 
        <View style={styles.textInputBox}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="white"
            autoCapitalize="none"
            style={styles.textInput}
            onChangeText={setEmail}
            value={email}
          />
        </View>
        <View style={styles.textInputBox}>
          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="white"
            autoCapitalize="none"
            style={styles.textInput}
            onChangeText={setPassword}
            value={password}
          />
        </View>
        <TouchableOpacity 
          style={[styles.submitButton,{backgroundColor:"blue"}]}
          onPress={handleLogin}
        >
          <Text style={{color:"white",fontSize:20,}}>Sign In</Text>
        </TouchableOpacity>
        <SocialIcon
          title={"Sign In With Google"}
          disabled={(Constants.appOwnership != "standalone" || Platform.OS == 'web') && !request}
          button={true}
          light
          style={styles.submitButton}
          type={"google"}
          onPress={async ()=>{
            if(Constants.appOwnership != "standalone" || Platform.OS == 'web') {
              console.log("promting async")
              promptAsync()
            } else {
              try {
                await GoogleSignIn.askForPlayServicesAsync();
                const { type, user } = await GoogleSignIn.signInAsync();
                if (type === 'success') {
                  const idToken = user.auth.idToken
                  console.log(idToken)
                  const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
                  firebase.auth().signInWithCredential(credential).catch((error) => {
                    console.log(error)
                    Alert.alert(error.message)
                  });
                }
              } catch ({ message }) {
                Alert.alert('login: Error:' + message);
              }
            }
          }}
        />
        <Button
          titleStyle={{color:"white"}}//"#d1faff"
          title="Don't have an account? Sign Up"
          disabled={(Constants.appOwnership != "standalone" || Platform.OS != 'web') && !request}
          onPress={() => navigation.navigate('SignUp',{email})}
          type="clear"
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:"red",
  },
  textInputBox: {
    borderBottomColor:"white",
    borderBottomWidth: 1,
    marginBottom: 40,
    alignSelf: 'stretch',
  },
  textInput: {
    fontSize: 24,
    height: 40,
    fontWeight: '200',
    marginBottom: 0,
    color:"white",
  },
  title: {
    fontSize:50,
    marginBottom:30,
    color:"white"
  },
  submitButton:{
    alignItems: 'center',
    padding:15,
    borderRadius:7,
    marginBottom:10,
    margin:7,
    alignSelf: 'stretch',
  },
  errorMessage:{
    color: 'blue', marginBottom:20
  }
})