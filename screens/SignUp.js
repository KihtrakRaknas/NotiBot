import React from 'react'
import { StyleSheet, Text, TextInput, View, Button, Alert, KeyboardAvoidingView, TouchableOpacity } from 'react-native'
import firebase from 'firebase';

export default function SignUp({ navigation, route}) {
    const [email, setEmail] = React.useState(route.params.email)
    const [password, setPassword] = React.useState('route.params.email')
    const [errorMessage, setErrorMessage] = React.useState(null)
    const handleSignUp = () => {
      firebase
        .auth()
        .createUserWithEmailAndPassword(this.state.email, this.state.password)
        .then(() => {
          firebase.firestore().collection('Users').doc(currentUser.uid).onSnapshot((doc) => {
            console.log("Current data: ", doc.data());
            if(checkUserFeilds(doc.data()))
              this.props.navigation.navigate('LoggedIn')
            else
              this.props.navigation.navigate('SetUp')
          });
        })
        .catch(error => {
          setErrorMessage(error.message)
          Alert.alert(error.message)
        })
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
          <Text style={styles.title}>Sign Up</Text>
          {this.state.errorMessage &&
          <Text style={{ color: 'blue', marginBottom:20 }}>
              {this.state.errorMessage}
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
              //secureTextEntry
              placeholder="Password"
              placeholderTextColor="white"
              autoCapitalize="none"
              style={styles.textInput}
              onChangeText={setPassword}
              value={password}
            />
          </View>
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={this.handleSignUp}
          >
            <Text style={{color:"white",fontSize:20,}}>Create Account</Text>
          </TouchableOpacity>
          <Button
            color="#d1faff"
            title="Already have an account? Login"
            onPress={() => navigation.navigate('Login')}
          />
      </KeyboardAvoidingView>
    )
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
    width:"90%",
  },
  textInput: {
    alignSelf: 'stretch',
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
    backgroundColor:"blue",
    width:"90%",
    padding:15,
    borderRadius:7,
    marginBottom:10
  },
})