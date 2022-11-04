import React from 'react'
import { StyleSheet, Platform, Image, Text, View, FlatList, ActivityIndicator, Modal, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView, Alert } from 'react-native'
import { ListItem, Button, Overlay, Avatar, Icon } from 'react-native-elements'
import WebModal from 'modal-react-native-web';
import DropDownPicker from 'react-native-dropdown-picker';
import firebase from 'firebase';
import { ProjectsContext } from '../utils/contexts'
import { groups } from '../utils/constants'

const groupDescriptions = ["Full Access", "Can't delete project or edit team members", "Can only view data, can't delete notifications"]

export default function Home({ navigation, route }) {
    const { projectsData, listenToProject, stopListeningToProject } = React.useContext(ProjectsContext);
    const projTitle = route.params.title
    const [users, setUsers] = React.useState([])
    const [currentGroupNum, setCurrentGroupNum] = React.useState(groups.length)
    const [canLeave, setCanLeave] = React.useState(false)
    const [visible, setVisible] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const profileInfoMap = React.useRef({});

    const db = firebase.firestore();

    const projectInfo = projectsData[projTitle]

    const currentUserUid = firebase.auth().currentUser.uid;

    React.useLayoutEffect(() => {
        const handleProjUpdate = (newData) => {
            console.log("triggered")
            if (newData) {
                let tempUsers = []
                let tempCurrentGroupNum
                for (let groupName of groups){
                    console.log(groupName)
                    if (newData[groupName])
                        for (let uid of newData[groupName]) {
                            console.log(uid)
                            if (uid == currentUserUid)
                                tempCurrentGroupNum = groups.indexOf(groupName)
                            if (!profileInfoMap.current[uid])
                                fetch("https://noti.kihtrak.com/getProfileInfo", { body: JSON.stringify({ uid }), method: 'POST', headers: { "Content-Type": "application/json" } }).then((res) => res.json()).then((profile) => {
                                    profileInfoMap.current[uid] = profile
                                    //console.log(profile)
                                    setUsers((users)=>[...users, { group: groupName, profile: profileInfoMap.current[uid] }])
                                })
                            else {
                                tempUsers.push({ group: groupName, profile: profileInfoMap.current[uid] }) // Don't re-render until finished
                            }
                        }
                }
                setCurrentGroupNum(tempCurrentGroupNum)
                if (tempUsers.length > 0)
                    setUsers(tempUsers)
                if (tempCurrentGroupNum != 0 || newData[groups[0]].length > 1)
                    setCanLeave(true)
                else
                    setCanLeave(false)
            } else
                navigation.goBack()
        }
        listenToProject(projTitle, handleProjUpdate, true)
        return () => stopListeningToProject(projTitle, handleProjUpdate)
    }, [])


    React.useLayoutEffect(() => {
        navigation.setOptions({
            title: `${projTitle} Options`,
        });
    }, [navigation]);

    const resetModalState = () => {
        setEmail('')
        setErrorMessage('')
    }

    const toggleOverlay = () => {
        resetModalState()
        setVisible(!visible);
    };

    const deleteProject = () => {
        Alert.alert(`Delete ${projTitle}`, `Are you sure you want to delete ${projTitle}?`,
            [{
                text: 'Delete',
                onPress: async () => {
                    firebase.auth().currentUser.getIdToken(true)
                        .then((idToken) => fetch("https://noti.kihtrak.com/deleteProject", { body: JSON.stringify({ idToken, project: projTitle }), method: 'POST', headers: { "Content-Type": "application/json" } }))
                        .catch(e => Alert.alert("An error occurred while attempting to delete the project"))
                },
                style: "destructive"
            }, { text: 'Cancel', style: 'cancel' },],
            { cancelable: true }
        );
    }

    const deleteNotifications = () => {
        Alert.alert(`Delete ${projTitle}`, `Are you sure you want to delete all of ${projTitle}'s notifications?`,
            [{
                text: 'Delete',
                onPress: async () => {
                    await db.collection('Projects').doc(projTitle).update({
                        Notifications: firebase.firestore.FieldValue.delete()
                    }).then(() => navigation.goBack()).catch(e => Alert.alert("An error occurred while attempting to delete the notifications"))
                },
                style: "destructive"
            }, { text: 'Cancel', style: 'cancel' },],
            { cancelable: true }
        );
    }

    const addUser = () => {
        fetch("https://noti.kihtrak.com/getProfileByEmail", { body: JSON.stringify({ email }), method: 'POST', headers: { "Content-Type": "application/json" } })
            .then((res) => res.json()).then((profile) => {
                console.log(profile)
                return firebase.auth().currentUser.getIdToken(true)
                    .then((idToken) => fetch("https://noti.kihtrak.com/addUserToProject", { 
                        body: JSON.stringify({ idToken, project: projTitle, uid:profile.uid }), 
                        method: 'POST', 
                        headers: { "Content-Type": "application/json" } 
                    }))
            }).then(()=>setVisible(false)).catch(e => Alert.alert(`An error occurred while attempting to add ${email} to the project`))
    }

    const removeUser = (email) => {
        fetch("https://noti.kihtrak.com/getProfileByEmail", { body: JSON.stringify({ email }), method: 'POST', headers: { "Content-Type": "application/json" } })
            .then((res) => res.json()).then((profile) => {
                console.log(profile)
                return firebase.auth().currentUser.getIdToken(true)
                    .then((idToken) => fetch("https://noti.kihtrak.com/removeUserFromProject", { 
                        body: JSON.stringify({ idToken, project: projTitle, uid:profile.uid }), 
                        method: 'POST', 
                        headers: { "Content-Type": "application/json" } 
                    }))
            }).catch(e => Alert.alert(`An error occurred while attempting to remove ${email} from the project`))
    }

    const leaveProject = async () => {
        await db.collection('Projects').doc(projTitle).update({
            [groups[currentGroupNum]]: firebase.firestore.FieldValue.arrayRemove(currentUserUid)
        })
        await db.collection('Users').doc(currentUserUid).update({
            'Projects': firebase.firestore.FieldValue.arrayRemove(projTitle)
        })
    }

    return (
        <>
            <Overlay isVisible={visible} onBackdropPress={toggleOverlay} ModalComponent={Platform.OS === 'web' ? WebModal : Modal} overlayStyle={[Platform.OS != 'web' ? { width: "80%", margin: "30%", maxWidth: 400 /*,flexGrow:1,flex:1,*/ } : {}, { backgroundColor: "red", borderRadius: 10, bottom: "20%" }]}>
                <View>
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
                    {errorMessage != '' &&
                        <Text style={styles.errorMessage}>
                            {errorMessage}
                        </Text>}
                    <Button
                        title="Add User"
                        onPress={addUser}
                    />
                </View>
            </Overlay>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={{width:"100%"}}>
                    {(() => {
                        let userElements = []
                        for(let itemIndex in users){
                            let item = users[itemIndex]
                            let controller
                            userElements.push(<ListItem key={item.profile.email} style={[styles.listItem, {zIndex: -1*itemIndex}]} bottomDivider topDivider>
                                <Avatar source={{ uri: item.profile.photoURL }} title={item.profile.email.substring(0,2)} rounded />
                                <ListItem.Content>
                                    <ListItem.Title>{item.profile.displayName}</ListItem.Title>
                                    <ListItem.Subtitle adjustsFontSizeToFit numberOfLines={1}>{item.profile.email}</ListItem.Subtitle>
                                </ListItem.Content>
                                <DropDownPicker disabled={currentGroupNum > 0 || (currentUserUid == item.profile.uid && !canLeave)} items={[...groups, "Remove"].map(el => ({ label: el, value: el }))} defaultValue={item.group} containerStyle={{ flexGrow: .5 }} itemStyle={{overflow: "visible"}} controller={instance => controller = instance} onChangeItem={(el)=>{
                                    const {value:newValue} = el
                                    console.log(newValue)
                                    if(newValue == "Remove"){
                                        Alert.alert(`Remove ${item.profile.email}`, `Are you sure you want remove ${item.profile.email} from this project?`,
                                            [{
                                                text: 'Remove',
                                                onPress: async () => {
                                                    removeUser(item.profile.email)
                                                },
                                                style: "destructive"
                                            }, 
                                            { text: 'Cancel', style: 'cancel',
                                                onPress: ()=>{
                                                    controller.selectItem(item.group)
                                                }
                                            }],
                                            { cancelable: true, onDismiss:()=>{
                                                controller.selectItem(item.group)
                                            }}
                                        );
                                    }else{
                                        const updateObj = {}
                                        groups.forEach(el => { updateObj[el] = firebase.firestore.FieldValue.arrayRemove(item.profile.uid) })
                                        updateObj[newValue] = firebase.firestore.FieldValue.arrayUnion(item.profile.uid)
                                        db.collection('Projects').doc(projTitle).update(updateObj)
                                    }
                                }}/>
                            </ListItem>)
                        }
                        if(userElements.length==0){
                            return <ActivityIndicator size="large" style={{padding:10}}/>
                        }
                        return userElements
                    })()}
                </View>
                {/* <FlatList
                    style={{ width: "100%", maxHeight: "60%" }}
                    data={users}
                    renderItem={({ item, index }) => {
                        //console.log(item)
                        return (<View style={{zIndex:-999999*index}}><ListItem style={styles.listItem} bottomDivider topDivider>
                            <Avatar source={{ uri: item.profile.photoURL }} rounded />
                            <ListItem.Content>
                                <ListItem.Title>{item.profile.displayName}</ListItem.Title>
                                <ListItem.Subtitle adjustsFontSizeToFit numberOfLines={1}>{item.profile.email}</ListItem.Subtitle>
                            </ListItem.Content>
                            <DropDownPicker disabled={currentGroupNum < 0} items={groups.map(el => ({ label: el, value: el }))} defaultValue={item.group} containerStyle={{ flexGrow: .5 }} style={{zIndex:999999*index}}/>
                        </ListItem></View>)
                    }}
                    keyExtractor={item => item.profile.uid}
                    ListEmptyComponent={<View style={{ flex: 1, flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}><ActivityIndicator size="large" /><Text>Populating with members...</Text></View>}
                /> */}
                <ListItem style={[{ zIndex: -9 }, styles.listItem]} bottomDivider topDivider disabled={currentGroupNum > 0} onPress={toggleOverlay}>
                    <Icon name='plus' type='ant-design' color='blue' />
                    <ListItem.Content>
                        <ListItem.Title>Add User</ListItem.Title>
                    </ListItem.Content>
                </ListItem>
                {(() => {
                    const arr = []
                    for (let groupIndex in groups) {
                        // console.log(`${groupIndex} - ${currentGroupNum}`)
                        arr.push(<View key={groupIndex} style={[styles.listItem, styles.descContainer]}>
                            <Text style={[groupIndex == currentGroupNum ? { color: 'blue' } : {}, styles.groupTitle, styles.groupText]}>{groups[groupIndex]}</Text>
                            <Text style={[styles.groupDesc, styles.groupText]}>{groupDescriptions[groupIndex]}</Text>
                        </View>)
                    }
                    return arr
                })()}
                <Button
                    disabled={currentGroupNum > 1}
                    containerStyle={{ marginTop: 20, }}
                    title="Delete Notifications"
                    buttonStyle={styles.deleteButton}
                    onPress={deleteNotifications}
                />
                <Button
                    disabled={!canLeave}
                    containerStyle={{ marginTop: 20, }}
                    title={`Leave Project`}
                    buttonStyle={styles.leaveButton}
                    onPress={leaveProject}
                />
                {!canLeave && <Text style={styles.explanationText}>You are the only owner, you can't leave until appointing a new owner</Text>}
                <Button
                    disabled={currentGroupNum > 0}
                    containerStyle={{ marginTop: 20, }}
                    title="Delete Project"
                    buttonStyle={styles.deleteButton}
                    onPress={deleteProject}
                />
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        //flex: 1,
        // justifyContent: 'center',
        paddingBottom:20,
        alignItems: "center"
    },
    deleteButton: {
        backgroundColor: "red"
    },
    leaveButton: {
        backgroundColor: "blue"
    },
    listItem: {
        width: "100%",
        //zIndex:-1
    },
    descContainer: {
        flexGrow: 1,
        flexDirection: "row",
        padding: 10,
        zIndex: -99
    },
    groupTitle: {
        marginRight: 10,
        flexBasis: 100,
    },
    groupText: {
        fontSize: 15,
    },
    groupDesc: {
        flexShrink: 1,
        flexWrap: 'wrap'
    },
    explanationText: {
        textAlign: "center",
        marginHorizontal: 20
    },
    textInputBox: {
        borderBottomColor: "white",
        borderBottomWidth: 1,
        marginBottom: 20,
        alignSelf: 'stretch',
    },
    textInput: {
        fontSize: 24,
        height: 40,
        fontWeight: '200',
        marginBottom: 0,
        color: "white",
        textAlign: 'center'
    }
})