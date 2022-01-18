import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    StyleSheet,
    View,
    Image,
    Dimensions,
    Text,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert,
    //Switch,
    Platform,
    Share
} from 'react-native';
import { Icon, Header } from 'react-native-elements';
import ActionSheet from "react-native-actions-sheet";
import { colors } from '../common/theme';
import * as ImagePicker from 'expo-image-picker';
import { language } from 'config';
var { width, height } = Dimensions.get('window');
import { useSelector, useDispatch } from 'react-redux';
import { FirebaseContext } from 'common/src';
import StarRating from 'react-native-star-rating';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';

export default function ProfileScreen(props) {
    const { api } = useContext(FirebaseContext);
    const {
        updateProfileImage,
        signOut,
        deleteUser,
        updateProfile
    } = api;
    const dispatch = useDispatch();
    const auth = useSelector(state => state.auth);
    const settings = useSelector(state => state.settingsdata.settings);
    const [profileData, setProfileData] = useState(null);
    const [loader, setLoader] = useState(false);

    const actionSheetRef = useRef(null);
    
    const LOCATION_TASK_NAME = 'background-location-task';

    useEffect(() => {
        if (auth.info && auth.info.profile) {
            setProfileData(auth.info.profile);
        }
    }, [auth.info]);

    // const onChangeFunction = () => {
    //     let res = !profileData.driverActiveStatus;
    //     dispatch(updateProfile(auth.info, { driverActiveStatus: res }));
    // }

    showActionSheet = () => {
        actionSheetRef.current?.setModalVisible(true);
    }

    uploadImage = () => {
        
        return (
            <ActionSheet ref={actionSheetRef}>
                <TouchableOpacity 
                    style={{width:'50%',alignSelf:'center',paddingLeft:20,paddingRight:20,borderColor:colors.GREY.iconPrimary,borderBottomWidth:1,height:60,alignItems:'center',justifyContent:'center'}} 
                    onPress={()=>{_pickImage('CAMERA', ImagePicker.launchCameraAsync)}}
                >
                    <Text style={{color:colors.GREEN.medium,fontWeight:'bold'}}>{language.camera}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{width:'50%',alignSelf:'center',paddingLeft:20,paddingRight:20,borderBottomWidth:1,borderColor:colors.BLACK,height:60,alignItems:'center',justifyContent:'center'}} 
                    onPress={()=>{ _pickImage('MEDIA', ImagePicker.launchImageLibraryAsync)}}
                >
                    <Text  style={{color:colors.GREEN.medium,fontWeight:'bold'}}>{language.medialibrary}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                     style={{width:'90%',alignSelf:'center',paddingLeft:20,paddingRight:20, height:50,alignItems:'center',justifyContent:'center'}} 
                    onPress={()=>{actionSheetRef.current?.setModalVisible(false);}}>
                    <Text  style={{color:colors.BLACK}}>Cancel</Text>
                </TouchableOpacity>
            </ActionSheet>
        )
    }

    _pickImage = async (permissionType, res) => {
        var pickFrom = res;
        let permisions;
        if(permissionType == 'CAMERA'){
            permisions = await ImagePicker.requestCameraPermissionsAsync();
        }else{
            permisions = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
        const { status } = permisions;
        
        if (status == 'granted') {
            setLoader(true);
            let result = await pickFrom({
                allowsEditing: true,
                aspect: [3, 3],
                base64: true
            });
            actionSheetRef.current?.setModalVisible(false);
            if (!result.cancelled) {
                let data = 'data:image/jpeg;base64,' + result.base64;
                setProfileData({
                    ...profileData,
                    profile_image: result.uri
                })
                const blob = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        resolve(xhr.response);
                    };
                    xhr.onerror = function () {
                        Alert.alert(language.alert, language.image_upload_error);
                        setLoader(false);
                    };
                    xhr.responseType = 'blob';
                    xhr.open('GET', Platform.OS == 'ios' ? data : result.uri, true);
                    xhr.send(null);
                });
                if (blob) {
                    dispatch(updateProfileImage(auth.info, blob));
                }
                setLoader(false);
            }
            else {
                setLoader(false);
            }
        } else {
            Alert.alert(language.alert, language.camera_permission_error)
        }
    };


    editProfile = () => {
        props.navigation.push('editUser');
    }

    const StopBackgroundLocation = async () => {
        let res = !auth.info.profile.driverActiveStatus;
        dispatch(updateProfile(auth.info, { driverActiveStatus: res }));
        TaskManager.getRegisteredTasksAsync().then((res)=>{
            if(res.length>0){
                for(let i=0;i<res.length;i++){
                    if(res[i].taskName == LOCATION_TASK_NAME){
                        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                        break;
                    }
                }
            }
        });
    }

    //sign out and clear all async storage
    logOff = () => {
        auth.info && auth.info.profile && auth.info.profile.usertype == 'driver'?  StopBackgroundLocation():null;
        AsyncStorage.removeItem('firstRun');
        props.navigation.navigate('Intro');
        setTimeout(() => {
            dispatch(signOut());
        }, 1000);  
    }

    //Delete current user
    deleteAccount = () => {
        Alert.alert(
            language.delete_account_modal_title,
            language.delete_account_modal_subtitle,
            [
                {
                    text: language.cancel,
                    onPress: () => console.log('Cancel Pressed'),
                    style: 'cancel',
                },
                {
                    text: language.yes, onPress: () => {
                        props.navigation.navigate('Intro');
                        dispatch(deleteUser(auth.info.uid));
                    }
                },
            ],
            { cancelable: false },
        );
    }

    goWallet = () => {
        props.navigation.navigate('wallet');
    }

    return (
        <View style={styles.mainView}>
            <Header
                backgroundColor={colors.WHITE}
                leftComponent={{ icon: 'body-outline', type: 'ionicon', color: colors.BLACK, size: 28, component: TouchableWithoutFeedback, onPress: () => { props.navigation.toggleDrawer(); } }}
                centerComponent={<Text style={styles.headerTitleStyle}>{language.profile_page_title}</Text>}
                containerStyle={styles.headerStyle}
                innerContainerStyles={{ marginLeft: 10, marginRight: 10 }}
            />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollStyle}>
                {
                    uploadImage()
                }
                {/* {profileData && profileData.usertype == 'driver' ?
                    <View style={styles.scrollViewStyle1} >
                        <Text style={styles.profStyle}>{language.active_status}</Text>
                        <Switch
                            style={styles.switchAlignStyle}
                            value={profileData ? profileData.driverActiveStatus : false}
                            onValueChange={onChangeFunction}
                        />
                    </View>
                    : null} */}
                    
                    {profileData && profileData.referralId ?
                    <View style={styles.scrollViewStyle} >
                                <Text style={styles.profStyle}>{language.referralId}</Text>
                                <TouchableOpacity 
                                    style={{marginLeft: 50}}
                                    onPress={()=>{
                                        settings.bonus>0?
                                        Share.share({
                                            message: language.share_msg + settings.code + ' ' + settings.bonus + ".\n"  +  language.code_colon +  auth.info.profile.referralId  + "\n" + language.app_link + (Platform.OS=="ios"? settings.AppleStoreLink : settings.PlayStoreLink)
                                        })
                                        :
                                        Share.share({
                                            message: language.share_msg_no_bonus + "\n"  + language.app_link + (Platform.OS=="ios"? settings.AppleStoreLink : settings.PlayStoreLink)
                                        })
                                    }}
                                >
                                    <Icon
                                        name={Platform.OS == 'android'? 'share-2' : 'share-2'}
                                        type='feather'
                                        color={colors.BLACK}
                                        size={30}
                                        containerStyle={{ right: 20 }}
                                    />
                                </TouchableOpacity>
                        </View>
                        : null}
                <View style={styles.viewStyle}>
                    <View style={styles.imageParentView}>
                        <View style={styles.imageViewStyle} >
                            {
                                loader ?
                                    <View style={[styles.loadingcontainer, styles.horizontal]}>
                                        <ActivityIndicator size="large" color={colors.BLACK} />
                                    </View>
                                    : <TouchableOpacity onPress={showActionSheet}>
                                        <Image source={profileData && profileData.profile_image ? { uri: profileData.profile_image } : require('../../assets/images/profilePic.png')} style={{ borderRadius: 100 / 2, width: 100, height: 100 }} />
                                    </TouchableOpacity>
                            }
                        </View>
                    </View>
                    <Text style={styles.textPropStyle} >{profileData && profileData.firstName.toUpperCase() + " " + profileData.lastName.toUpperCase()}</Text>
                </View>
                {/* <View style={styles.scrollViewStyle} >
                    <Text style={styles.profStyle}>{language.profile_page_subtitle}</Text>
                    <Icon
                        name='edit'
                        type='feather'
                        color={colors.BLACK}
                        containerStyle={{ right: 20 }}
                        onPress={editProfile}
                    />
                </View> */}

                <View style={styles.newViewStyle}>
                    <View style={styles.myViewStyle}>
                        <View style={styles.iconViewStyle}>
                            <Icon
                                name='mail'
                                type='feather'
                                color={colors.GREY.btnPrimary}
                                size={20}
                            />
                            <Text style={styles.emailStyle}>{language.email_placeholder}</Text>
                        </View>
                        <View style={styles.flexView1}>
                            <Text style={styles.emailAdressStyle}>{profileData ? profileData.email : ''}</Text>
                        </View>
                    </View>
                    <View style={styles.myViewStyle}>
                        <View style={styles.iconViewStyle}>
                            <Icon
                                name='smartphone'
                                type='feather'
                                color={colors.GREY.btnPrimary}
                                size={20}
                            />
                            <Text style={styles.text1}>{language.mobile_no_placeholder}</Text>
                        </View>
                        <View style={styles.flexView2}>
                            <Text style={styles.text2}>{profileData ? profileData.mobile : ''}</Text>
                        </View>
                    </View>

                    {/* <View style={styles.myViewStyle}>
                        <View style={styles.iconViewStyle}>
                            <Icon
                                name='user'
                                type='simple-line-icon'
                                color={colors.GREY.btnPrimary}
                            />
                            <Text style={styles.emailStyle}>{language.usertype}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.text2}>{profileData ? profileData.usertype : ''}</Text>
                        </View>
                    </View> */}
                    {profileData && profileData.usertype == 'driver'?
                    <View style={styles.myViewStyle}>
                        <View style={styles.iconViewStyle}>
                            <Icon
                                name='package'
                                type='feather'
                                color={colors.GREY.btnPrimary}
                                size={20}
                            />
                            <Text style={styles.emailStyle}>{language.delivery_type}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.text2}>{profileData.carType}</Text>
                        </View>
                    </View>
                    :null}
                    {profileData && profileData.usertype == 'driver'?
                    <View style={styles.myViewStyle}>
                        <View style={styles.iconViewStyle}>
                            <Icon
                                name='star'
                                type='feather'
                                color={colors.GREY.btnPrimary}
                                size={20}
                            />
                            <Text style={styles.emailStyle}>{language.you_rated_text}</Text>
                        </View>
                        <View style={{ flex: 1, flexDirection:'row' }}>
                            <Text style={styles.text2}>{profileData && profileData.usertype && profileData.ratings? profileData.ratings.userrating:0}</Text>
                            <StarRating
                                disabled={false}
                                maxStars={5}
                                starSize={15}
                                fullStar={'ios-star'}
                                halfStar={'ios-star-half'}
                                emptyStar={'ios-star-outline'}
                                iconSet={'Ionicons'}
                                fullStarColor={colors.GREEN.medium}
                                emptyStarColor={colors.GREEN.medium}
                                halfStarColor={colors.GREEN.medium}
                                rating={profileData && profileData.usertype && profileData.ratings? parseFloat(profileData.ratings.userrating):0}
                                containerStyle={styles.contStyle}
                            />
                        </View>
                    </View>
                    :null}
                </View>

                <View style={styles.flexView3}>

                    <TouchableOpacity onPress={logOff} style={styles.textIconStyle2}>
                        <Text style={styles.emailStyle}>{language.logout}</Text>
                        <Icon
                            name='chevrons-right'
                            type='feather'
                            color={colors.GREY.btnPrimary}
                            size={30}
                            containerStyle={{ right: 20 }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.textIconStyle2} onPress={deleteAccount}>
                        <Text style={styles.emailStyle}>{language.delete_account_lebel}</Text>
                        <Icon
                            name='frown'
                            type='feather'
                            color={colors.GREY.btnPrimary}
                            size={30}
                            containerStyle={{ right: 20 }}
                        />
                    </TouchableOpacity>
                    
                </View>

            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    headerStyle: {
        backgroundColor: colors.WHITE,
        borderBottomWidth: 0
    },
    headerTitleStyle: {
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 18
    },
    logo: {
        flex: 1,
        position: 'absolute',
        top: 90,
        width: '100%',
        justifyContent: "flex-end",
        alignItems: 'center'
    },
    footer: {
        flex: 1,
        position: 'absolute',
        bottom: 0,
        height: 170,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    scrollStyle: {
        flex: 1,
        height: height,
        backgroundColor: colors.WHITE
    },
    scrollViewStyle1: {
        width: width,
        height: 25,
        marginTop: 0,
        backgroundColor: colors.WHITE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    scrollViewStyle: {
        width: width,
        height: 35,
        marginTop: 12,
        backgroundColor: colors.GREEN.light,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    profStyle: {
        fontSize: 16,
        left: 10,
        fontWeight: 'bold',
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold'
    },
    bonusAmount: {
        right: 20,
        fontSize: 16,
        fontWeight: 'bold'
    },
    viewStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8
    },
    imageParentView: {
        borderRadius: 140 / 2,
        width: 110,
        height: 110,
        backgroundColor: colors.GREEN.medium,
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageViewStyle: {
        borderRadius: 120 / 2,
        width: 100,
        height: 100,
        backgroundColor: colors.WHITE,
        justifyContent: 'center',
        alignItems: 'center'
    },
    textPropStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.GREY.iconSecondary,
        fontFamily: 'Ubuntu-Bold',
        top: 8,
        textTransform: 'uppercase'
    },
    newViewStyle: {
        flex: 1,
        marginTop: 10
    },
    myViewStyle: {
        flex: 1,
        left: 20,
        marginRight: 40,
        marginBottom: 8,
        borderBottomColor: colors.GREY.btnSecondary,
        borderBottomWidth: 1
    },
    iconViewStyle: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center'
    },
    emailStyle: {
        fontSize: 14,
        left: 10,
        color: colors.GREY.btnPrimary,
        fontFamily: 'Ubuntu-Bold'
    },
    emailAdressStyle: {
        fontSize: 14,
        color: colors.GREY.secondary,
        fontFamily: 'Ubuntu-Regular'
    },
    mainIconView: {
        flex: 1,
        left: 20,
        marginRight: 40,
        borderBottomColor: colors.GREY.iconSecondary,
        borderBottomWidth: 1
    },
    text1: {
        fontSize: 14,
        left: 10,
        color: colors.GREY.btnPrimary,
        fontFamily: 'Ubuntu-Bold'
    },
    text2: {
        fontSize: 14,
        left: 10,
        color: colors.GREY.secondary,
        fontFamily: 'Ubuntu-Regular'
    },
    textIconStyle: {
        width: width,
        height: 20,
        backgroundColor: colors.GREY.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    textIconStyle2: {
        width: width,
        height: 30,
        marginTop: 10,
        backgroundColor: colors.GREY.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    mainView: {
        flex: 1,
        backgroundColor: colors.WHITE,
        //marginTop: StatusBar.currentHeight 
    },
    flexView1: {
        flex: 1
    },
    flexView2: {
        flex: 1
    },
    flexView3: {
        marginTop: 10
    },
    loadingcontainer: {
        flex: 1,
        justifyContent: 'center'
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10
    },
    contStyle: {
        width:90,
        marginLeft: 20
    }
});