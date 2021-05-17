import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

export default function Loading() {
  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading</Text>
      <ActivityIndicator size="large" color="white"/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:"red"
  },
  loadingText:{
    marginBottom:20,
    color:"white"
  }
})