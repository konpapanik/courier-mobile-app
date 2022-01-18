import React, { useEffect, useState, useRef, useContext } from 'react';
import {
    StyleSheet,
    View,
    Image,
    Dimensions,
    Text,
    Platform,
    Alert,
    Modal,
    ScrollView,
    KeyboardAvoidingView
} from 'react-native';
import { TouchableOpacity as OldTouch } from 'react-native';
import { TouchableOpacity, BaseButton, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { MapComponent } from '../components';
import { Icon, Header, Tooltip, Input } from 'react-native-elements';
import { colors } from '../common/theme';
import * as Location from 'expo-location';
var { height, width } = Dimensions.get('window');
import { language } from 'config';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSelector, useDispatch } from 'react-redux';
import { NavigationEvents } from 'react-navigation';
import { store, FirebaseContext } from 'common/src';
import RadioForm, {RadioButton, RadioButtonInput, RadioButtonLabel} from 'react-native-simple-radio-button';
import { color } from 'react-native-reanimated';

export default function MapScreen(props) {
    const { api } = useContext(FirebaseContext);
    const {
        fetchAddressfromCoords,
        fetchDrivers,
        updateTripPickup,
        updateTripDrop,
        updatSelPointType,
        getDriveTime,
        GetDistance,
        MinutesPassed,
        updateTripCar,
        getEstimate,
        clearEstimate,
        addBooking,
        clearBooking,
        clearTripPoints
    } = api;
    const dispatch = useDispatch();

    const auth = useSelector(state => state.auth);
    const settings = useSelector(state => state.settingsdata.settings);
    const cars = useSelector(state => state.cartypes.cars);
    const tripdata = useSelector(state => state.tripdata);
    const drivers = useSelector(state => state.usersdata.users);
    const estimatedata = useSelector(state => state.estimatedata);
    const activeBookings = useSelector(state => state.bookinglistdata.active);
    const gps = useSelector(state => state.gpsdata);

    const latitudeDelta = 0.0260;
    const longitudeDelta = 0.0281;

    const [allCarTypes,setAllCarTypes] = useState([]);
    const [freeCars, setFreeCars] = useState([]);
    const [pickerConfig,setPickerConfig] = useState({
        selectedDateTime: new Date(),
        dateModalOpen: false,
        dateMode: 'date'
    });
    const [loadingModal, setLoadingModal] = useState(false);
    const [mapMoved,setMapMoved] = useState(false);
    const [region,setRegion] = useState(null);
    const pageActive = useRef(false);
    const [optionModalStatus, setOptionModalStatus] = useState(false);
    const [bookingDate,setBookingDate] = useState(null);
    const [bookingModalStatus, setBookingModalStatus] = useState(false);

    const instructionInitData = {
        deliveryPerson : "",
        deliveryPersonPhone: "",
        pickUpInstructions: "",
        deliveryInstructions: "",
        parcelTypeIndex: 0,
        optionIndex: 0,
        parcelTypeSelected: null,
        optionSelected: null
    };
    const [instructionData,setInstructionData] = useState(instructionInitData);
    const bookingdata = useSelector(state => state.bookingdata);
    const [locationRejected,setLocationRejected] = useState(false);

    useEffect(() => {
        if (cars) {
            resetCars();
        }
    },[cars]);

    useEffect(() => {
        if (tripdata.pickup && drivers) {
            getDrivers();
        }
        if (tripdata.pickup && !drivers) {
            resetCars();
            setFreeCars([]);
        }
    }, [drivers, tripdata.pickup]);

    useEffect(()=>{
        if(estimatedata.estimate){
            setBookingModalStatus(true);
        }
        if(estimatedata.error && estimatedata.error.flag){
            Alert.alert(estimatedata.error.msg);
            dispatch(clearEstimate());
        }
    },[estimatedata.estimate,estimatedata.error, estimatedata.error.flag]);
 
    useEffect(()=>{
        if(tripdata.selected &&  tripdata.selected == 'pickup' && tripdata.pickup && !mapMoved && tripdata.pickup.source == 'search'){
            setRegion({
                latitude: tripdata.pickup.lat,
                longitude: tripdata.pickup.lng,
                latitudeDelta: latitudeDelta,
                longitudeDelta: longitudeDelta
            });
        }
        if(tripdata.selected &&  tripdata.selected == 'drop' && tripdata.drop  && !mapMoved && tripdata.drop.source == 'search'){
            setRegion({
                latitude: tripdata.drop.lat,
                longitude: tripdata.drop.lng,
                latitudeDelta: latitudeDelta,
                longitudeDelta: longitudeDelta
            });
        }
    },[tripdata.selected,tripdata.pickup,tripdata.drop]);

    useEffect(() => {
        if (bookingdata.booking) {
            props.navigation.navigate('PaymentDetails', { booking: bookingdata.booking.mainData });
            dispatch(clearEstimate());
            dispatch(clearBooking());
        }
        if (bookingdata.error && bookingdata.error.flag) {
            Alert.alert(bookingdata.error.msg);
            dispatch(clearBooking());
        }
    }, [bookingdata.booking, bookingdata.error, bookingdata.error.flag]);

    useEffect(()=>{
        setInterval(() => {
            if(pageActive.current){
                dispatch(fetchDrivers());
            }
        }, 30000);
    },[])

    useEffect(() => {  
        if(gps.location){  
            if(gps.location.lat && gps.location.lng){
                setRegion({
                    latitude: gps.location.lat,
                    longitude: gps.location.lng,
                    latitudeDelta: latitudeDelta,
                    longitudeDelta: longitudeDelta
                });
                updateMap({
                    latitude: gps.location.lat,
                    longitude: gps.location.lng
                },tripdata.pickup?'geolocation':'init');
            } else { 
                setLocationRejected(true);
                setLoadingModal(false);
                dispatch(updateTripPickup({
                    lat: 0,
                    lng: 0,
                    add: '',
                    source: 'error'
                }));
                dispatch(updateTripDrop({
                    lat: 0,
                    lng: 0,
                    add: '',
                    source: 'error'
                }));
            }
        }
    }, [gps.location]);

    const resetCars = () => {
        let carWiseArr = [];
        for (let i = 0; i < cars.length; i++) {
            let temp = { ...cars[i], minTime: '', available: false, active: false };
            carWiseArr.push(temp);
        }
        setAllCarTypes(carWiseArr);
    }

    const resetActiveCar = () => {
        let carWiseArr = [];
        for (let i = 0; i < allCarTypes.length; i++) {
            let temp = { ...allCarTypes[i], active: false };
            carWiseArr.push(temp);
        }
        setAllCarTypes(carWiseArr);
    }

    const locateUser = async () => {
        if(tripdata.selected == 'pickup'){
            setLoadingModal(true);
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, });
            if (location) {
                store.dispatch({
                    type: 'UPDATE_GPS_LOCATION',
                    payload: {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude
                    }
                });
            }else{
                setLoadingModal(false);
            }
        }
    }

    const updateMap = async (pos,source) => {
        let latlng = pos.latitude + ',' + pos.longitude;
        setLoadingModal(true);
        fetchAddressfromCoords(Platform.OS, latlng).then((res) => {
            if (res) {
                if (tripdata.selected == 'pickup') {
                    dispatch(updateTripPickup({
                        lat: pos.latitude,
                        lng: pos.longitude,
                        add: res,
                        source: source
                    }));
                    if(source == 'init'){
                        dispatch(updateTripDrop({
                            lat: pos.latitude,
                            lng: pos.longitude,
                            add: null,
                            source: source
                        }));
                    }
                } else {
                    dispatch(updateTripDrop({
                        lat: pos.latitude,
                        lng: pos.longitude,
                        add: res,
                        source: source
                    }));
                }
            }
            setLoadingModal(false);
        });
    }  

    const onRegionChangeComplete = (newregion) => {
        setRegion(newregion);
        if (mapMoved) {
            setMapMoved(false);
            updateMap({
                latitude: newregion.latitude,
                longitude: newregion.longitude
            },'region-change');
        }
    }

    const onPanDrag = (coordinate, position) => {
        if (!mapMoved) {
            setMapMoved(true);
        }
    }

    const selectCarType = (value, key) => {
        let carTypes = allCarTypes;
        for (let i = 0; i < carTypes.length; i++) {
            carTypes[i].active = false;
            if (carTypes[i].name == value.name) {
                carTypes[i].active = true;
                let instObj = {...instructionData};
                if(Array.isArray(carTypes[i].parcelTypes)){
                    instObj.parcelTypeSelected = carTypes[i].parcelTypes[0];
                    instObj.parcelTypeIndex = 0;
                }
                if(Array.isArray(carTypes[i].options)){
                    instObj.optionSelected = carTypes[i].options[0];
                    instObj.optionIndex = 0;
                }
                setInstructionData(instObj);
            } else {
                carTypes[i].active = false;
            }
        }        
        dispatch(updateTripCar(value));
    }

    const getDrivers = async () => {
        if (tripdata.pickup) {
            let availableDrivers = [];
            let arr = {};
            let startLoc = '"' + tripdata.pickup.lat + ', ' + tripdata.pickup.lng + '"';
            for (let i = 0; i < drivers.length; i++) {
                let driver = { ...drivers[i] };
                if ((driver.usertype) && (driver.usertype == 'driver') && (driver.approved == true) && (driver.queue == false) && (driver.driverActiveStatus == true)) {
                    if (driver.location) {
                        let distance = GetDistance(tripdata.pickup.lat, tripdata.pickup.lng, driver.location.lat, driver.location.lng);
                        if(settings.convert_to_mile){
                            distance = distance / 1.609344;
                        }
                        if (distance < 10000) {
                            let destLoc = '"' + driver.location.lat + ', ' + driver.location.lng + '"';
                            driver.arriveDistance = distance;
                            driver.arriveTime = await getDriveTime(Platform.OS, startLoc, destLoc);
                            let carType = driver.carType;
                            if (arr[carType] && arr[carType].drivers) {
                                arr[carType].drivers.push(driver);
                                if (arr[carType].minDistance > distance) {
                                    arr[carType].minDistance = distance;
                                    arr[carType].minTime = driver.arriveTime.timein_text;
                                }
                            } else {
                                arr[carType] = {};
                                arr[carType].drivers = [];
                                arr[carType].drivers.push(driver);
                                arr[carType].minDistance = distance;
                                arr[carType].minTime = driver.arriveTime.timein_text;
                            }
                            availableDrivers.push(driver);

                        }
                    }
                }
            }
            let carWiseArr = [];

            for (let i = 0; i < cars.length; i++) {
                let temp = { ...cars[i] };
                if (arr[cars[i].name]) {
                    temp['nearbyData'] = arr[cars[i].name].drivers;
                    temp['minTime'] = arr[cars[i].name].minTime;
                    temp['available'] = true;
                } else {
                    temp['minTime'] = '';
                    temp['available'] = false;
                }
                temp['active'] = (tripdata.carType && (tripdata.carType.name == cars[i].name)) ? true : false;
                carWiseArr.push(temp);
            }
            
            setFreeCars(availableDrivers);
            setAllCarTypes(carWiseArr);

            availableDrivers.length == 0 ? showNoDriverAlert() : null;
        }
    }

    const showNoDriverAlert = () => {
        if (tripdata.pickup && (tripdata.pickup.source == 'search' || tripdata.pickup.source == 'region-change') && tripdata.selected == 'pickup') {
            Alert.alert(
                language.no_driver_found_alert_title,
                language.no_driver_found_alert_messege,
                [
                    {
                        text: language.no_driver_found_alert_OK_button,
                        onPress: () => setLoadingModal(false),
                    }
                ],
                { cancelable: true },
            )
        }

    }

    const tapAddress = (selection) => {
        if (selection === tripdata.selected) {
            let savedAddresses = [];
            let allAddresses = auth.info.profile.savedAddresses;
            for (let key in allAddresses) {
                savedAddresses.push(allAddresses[key]);
            }
            if (selection == 'drop') {
                props.navigation.navigate('Search', { locationType: "drop", savedAddresses: savedAddresses });
            } else {
                props.navigation.navigate('Search', { locationType: "pickup", savedAddresses: savedAddresses  });
            }
        } else {
            dispatch(updatSelPointType(selection));
            if (selection == 'drop') {
                setRegion({
                    latitude: tripdata.drop.lat,
                    longitude: tripdata.drop.lng,
                    latitudeDelta: latitudeDelta,
                    longitudeDelta: longitudeDelta
                });
            } else {
                setRegion({
                    latitude: tripdata.pickup.lat,
                    longitude: tripdata.pickup.lng,
                    latitudeDelta: latitudeDelta,
                    longitudeDelta: longitudeDelta
                });
            }
        }

    };

    //Go to confirm booking page
    const onPressBook = () => {
        if (tripdata.pickup && tripdata.drop && tripdata.drop.add) {
            if (!tripdata.carType) {
                Alert.alert(language.alert, language.delivery_type_error)
            } else {
                let driver_available = false;
                for (let i = 0; i < allCarTypes.length; i++) {
                    let car = allCarTypes[i];
                    if (car.name == tripdata.carType.name && car.minTime) {
                        driver_available = true;
                        break;
                    }
                }
                if (driver_available) {
                    setBookingDate(null);
                    if(Array.isArray(tripdata.carType.options) || Array.isArray(tripdata.carType.parcelTypes)){
                        setOptionModalStatus(true);
                    }else{
                        const estimateObject = {
                            bookLater: bookingDate?true:false,
                            bookingDate: bookingDate,
                            pickup: {coords: {lat:tripdata.pickup.lat, lng:tripdata.pickup.lng} , description: tripdata.pickup.add},
                            drop:  {coords: {lat:tripdata.drop.lat, lng:tripdata.drop.lng}, description: tripdata.drop.add},
                            carDetails: tripdata.carType,
                            instructionData: instructionData,
                            platform: Platform.OS
                        };
                        dispatch(getEstimate(estimateObject));
                    }
                } else {
                    Alert.alert(language.alert, language.no_driver_found_alert_messege);
                }
            }
        } else {
            Alert.alert(language.alert, language.drop_location_blank_error);
        }
    }


    const onPressBookLater = () => {
        if (tripdata.pickup && tripdata.drop && tripdata.drop.add) {
            if (tripdata.carType) {
                setPickerConfig({
                    dateMode: 'date', 
                    dateModalOpen: true,
                    selectedDateTime: pickerConfig.selectedDateTime
                });
            } else {
                Alert.alert(language.alert, language.delivery_type_error)
            }
        } else {
            Alert.alert(language.alert, language.drop_location_blank_error)
        }
    }

    const hideDatePicker = () => {
        setPickerConfig({
            dateModalOpen: false, 
            selectedDateTime: pickerConfig.selectedDateTime,
            dateMode: 'date'
        })
    };

    const handleDateConfirm = (date) => {        
        if (pickerConfig.dateMode === 'date') {
            setPickerConfig({
                dateModalOpen: false, 
                selectedDateTime: date,
                dateMode:pickerConfig.dateMode
            })
            setTimeout(() => {
                setPickerConfig({
                    dateModalOpen: true, 
                    selectedDateTime: date,
                    dateMode: 'time'
                })
            }, 1000);
        } else {
            setPickerConfig({
                dateModalOpen: false, 
                selectedDateTime: date,
                dateMode: 'date'
            })
            setTimeout(() => {
                const diffMins = MinutesPassed(date);
                if (diffMins < 15) {
                    Alert.alert(
                        language.alert,
                        language.past_booking_error,
                        [
                            { text: "OK", onPress: () => { } }
                        ],
                        { cancelable: true }
                    );
                } else {
                    setBookingDate(date);
                    if(Array.isArray(tripdata.carType.options) || Array.isArray(tripdata.carType.parcelTypes)){
                        setOptionModalStatus(true);
                    }else{
                        const estimateObject = {
                            bookLater: bookingDate?true:false,
                            bookingDate: bookingDate,
                            pickup: {coords: {lat:tripdata.pickup.lat, lng:tripdata.pickup.lng} , description: tripdata.pickup.add},
                            drop:  {coords: {lat:tripdata.drop.lat, lng:tripdata.drop.lng}, description: tripdata.drop.add},
                            carDetails: tripdata.carType,
                            instructionData: instructionData,
                            platform: Platform.OS
                        };
                        dispatch(getEstimate(estimateObject));
                    }
                }
            }, 1000);
        }
    };

    const handleGetEstimate = () => {
        setOptionModalStatus(false);
        const estimateObject = {
            bookLater: bookingDate?true:false,
            bookingDate: bookingDate,
            pickup: {coords: {lat:tripdata.pickup.lat, lng:tripdata.pickup.lng} , description: tripdata.pickup.add},
            drop:  {coords: {lat:tripdata.drop.lat, lng:tripdata.drop.lng}, description: tripdata.drop.add},
            carDetails: tripdata.carType,
            instructionData: instructionData,
            platform: Platform.OS
        };
        dispatch(getEstimate(estimateObject));
    }

    const  LoadingModalBody = () => {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={loadingModal}
                onRequestClose={() => {
                    setLoadingModal(false);
                }}
                
            >
                <View style={{ flex: 1, backgroundColor: "rgba(22,22,22,0.7)", justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '85%', backgroundColor: colors.WHITE, borderRadius: 40, flex: 1, maxHeight: 150 }}>
                        <View style={{ alignItems: 'center', flexDirection: 'row', flex: 1, justifyContent: "center" }}>
                            <Image
                                style={{ width: 35, height: 35, backgroundColor: "#f1f2f0" }}
                                source={require('../../assets/images/searchbottom.gif')}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.BLACK, fontSize: 20, }}>{language.driver_finding_alert}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        )
    }

    const handleParcelTypeSelection = (value) => {
        setInstructionData({
            ...instructionData, 
            parcelTypeIndex: value,
            parcelTypeSelected: tripdata.carType.parcelTypes[value]
        });
    }

    const handleOptionSelection = (value) => {
        setInstructionData({
            ...instructionData, 
            optionIndex: value,
            optionSelected: tripdata.carType.options[value]
        });
    }

    const onModalCancel = () => {
        setInstructionData(instructionInitData);
        dispatch(updateTripCar(null));
        setBookingModalStatus(false);
        setOptionModalStatus(false);
        resetActiveCar();
    }

    const OptionModalBody = () => {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={optionModalStatus}
                onRequestClose={() => {
                    setOptionModalStatus(false);
                }}    
            >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    {tripdata.carType && tripdata.carType.parcelTypes ?
                    <View>
                        <Text style={{color:colors.BLACK,fontWeight:'bold', fontSize:16}}>{language.parcel_type}</Text>
                        <RadioForm
                            initial={0}
                            formHorizontal={false}
                            labelHorizontal={true}
                            buttonColor={colors.GREY.secondary}
                            labelColor={colors.BLACK}
                            style={{marginTop:10}}
                            labelStyle ={{marginLeft: 0}}
                            selectedButtonColor={colors.BLACK}
                            selectedLabelColor={colors.BLACK}
                        >
                            {
                            tripdata.carType.parcelTypes.map((obj, i) => (
                                <RadioButton labelHorizontal={true} key={i} >
                                    <RadioButtonInput
                                        obj={{label:settings.symbol + ' ' + obj.amount + ' - ' + obj.description ,value: i}}
                                        index={i}
                                        isSelected={instructionData.parcelTypeIndex === i}
                                        onPress={handleParcelTypeSelection}
                                    />
                                    <RadioButtonLabel
                                        obj={{label:settings.symbol + ' ' + obj.amount + ' - ' + obj.description ,value: i}}
                                        index={i}
                                        labelHorizontal={true}
                                        onPress={handleParcelTypeSelection}
                                    />
                                </RadioButton>
                            ))
                            }
                        </RadioForm>
                    </View>
                    :null}
                    {tripdata.carType && tripdata.carType.options ?
                    <View style={{marginTop:20}}>
                        <Text style={{color:colors.BLACK,fontWeight:'bold', fontSize:16}}>{language.options}</Text>
                        <RadioForm
                            initial={0}
                            formHorizontal={false}
                            labelHorizontal={true}
                            buttonColor={colors.GREY.secondary}
                            labelColor={colors.BLACK}
                            style={{marginTop:10}}
                            labelStyle ={{marginLeft: 0}}
                            selectedButtonColor={colors.BLACK}
                            selectedLabelColor={colors.BLACK}
                        >
                            {
                            tripdata.carType.options.map((obj, i) => (
                                <RadioButton labelHorizontal={true} key={i} >
                                    <RadioButtonInput
                                        obj={{label:settings.symbol + ' ' + obj.amount + ' - ' + obj.description ,value: i}}
                                        index={i}
                                        isSelected={instructionData.optionIndex === i}
                                        onPress={handleOptionSelection}
                                    />
                                    <RadioButtonLabel
                                        obj={{label:settings.symbol + ' ' + obj.amount + ' - ' + obj.description ,value: i}}
                                        index={i}
                                        labelHorizontal={true}
                                        onPress={handleOptionSelection}
                                    />
                                </RadioButton>
                            ))
                            }
                        </RadioForm>
                    </View>
                    :null}
                    <View style={{flexDirection:'row', marginTop:20, alignSelf:'center', height:40}}>
                        <OldTouch
                            loading={false}
                            onPress={onModalCancel}
                            style={[styles.modalButtonStyle,{marginRight:5}]}
                        >
                            <Text style={styles.modalButtonTextStyle}>{language.cancel}</Text>
                        </OldTouch>
                        <OldTouch
                            loading={false}
                            onPress={handleGetEstimate}
                            style={[styles.modalButtonStyle,{marginLeft:5,backgroundColor:colors.GREEN.bright}]}
                        >
                            <Text style={styles.modalButtonTextStyle}>{language.ok}</Text>
                        </OldTouch>
                    </View>
                </View>
            </View>
            </Modal>

        )
    }

    const bookNow = () => {
        if(instructionData.deliveryPerson && instructionData.deliveryPersonPhone){
            dispatch(addBooking({
                pickup: estimatedata.estimate.pickup,
                drop: estimatedata.estimate.drop,
                carDetails: estimatedata.estimate.carDetails,
                userDetails: auth.info,
                estimate: estimatedata.estimate,
                instructionData: instructionData,
                tripdate: estimatedata.estimate.bookLater ? new Date(estimatedata.estimate.bookingDate).toString() : new Date().toString(),
                bookLater: estimatedata.estimate.bookLater,
                settings: settings,
                booking_type_web: false
            }));
            setInstructionData(instructionInitData);
            dispatch(clearTripPoints());
            setBookingModalStatus(false);
            setOptionModalStatus(false);
            resetCars();
        }else{
             Alert.alert(language.alert,language.deliveryDetailMissing);
        }
    };

    const BookingModalBody = () => {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={bookingModalStatus}
                onRequestClose={() => {
                    setBookingModalStatus(false);
                }}    
            >
            <View style={styles.centeredView}>
                <KeyboardAvoidingView behavior={"position"}>
                <View style={styles.modalView}>
                    {estimatedata.estimate ?
                    <View style={styles.rateViewStyle}>
                        <Text style={styles.rateViewTextStyle}>{settings.symbol}{estimatedata.estimate.estimateFare > 0 ? parseFloat(estimatedata.estimate.estimateFare).toFixed(2) : 0}</Text>
                    </View>
                    :null}
                    <View style={styles.textInputContainerStyle}>
                        <Input
                            editable={true}
                            underlineColorAndroid={colors.TRANSPARENT}
                            placeholder={language.deliveryPerson}
                            placeholderTextColor={colors.GREY.secondary}
                            value={instructionData.deliveryPerson}
                            keyboardType={'email-address'}
                            inputStyle={styles.inputTextStyle}
                            onChangeText={(text) => { setInstructionData({ ...instructionData, deliveryPerson: text }) }}
                            inputContainerStyle={styles.inputContainerStyle}
                            containerStyle={styles.textInputStyle}
                        />
                    </View>
                    <View style={styles.textInputContainerStyle}>
                        <Input
                            editable={true}
                            underlineColorAndroid={colors.TRANSPARENT}
                            placeholder={language.deliveryPersonPhone}
                            placeholderTextColor={colors.GREY.secondary}
                            value={instructionData.deliveryPersonPhone}
                            keyboardType={'number-pad'}
                            inputStyle={styles.inputTextStyle}
                            onChangeText={(text) => { setInstructionData({ ...instructionData, deliveryPersonPhone: text }) }}
                            inputContainerStyle={styles.inputContainerStyle}
                            containerStyle={styles.textInputStyle}
                        />
                    </View>
                    <View style={styles.textInputContainerStyle}>
                        <Input
                            editable={true}
                            underlineColorAndroid={colors.TRANSPARENT}
                            placeholder={language.pickUpInstructions}
                            placeholderTextColor={colors.GREY.secondary}
                            value={instructionData.pickUpInstructions}
                            keyboardType={'email-address'}
                            inputStyle={styles.inputTextStyle}
                            onChangeText={(text) => { setInstructionData({ ...instructionData, pickUpInstructions: text }) }}
                            inputContainerStyle={styles.inputContainerStyle}
                            containerStyle={styles.textInputStyle}
                        />
                    </View>
                    <View style={styles.textInputContainerStyle}>
                        <Input
                            editable={true}
                            underlineColorAndroid={colors.TRANSPARENT}
                            placeholder={language.deliveryInstructions}
                            placeholderTextColor={colors.GREY.secondary}
                            value={instructionData.deliveryInstructions}
                            keyboardType={'email-address'}
                            inputStyle={styles.inputTextStyle}
                            onChangeText={(text) => { setInstructionData({ ...instructionData, deliveryInstructions: text }) }}
                            inputContainerStyle={styles.inputContainerStyle}
                            containerStyle={styles.textInputStyle}
                        />
                    </View>
                    <View style={{flexDirection:'row',  alignSelf:'center', height:40}}>
                        <OldTouch
                                loading={false}
                                onPress={onModalCancel}
                                style={[styles.modalButtonStyle,{marginRight:5}]}
                            >
                                <Text style={styles.modalButtonTextStyle}>{language.cancel}</Text>
                        </OldTouch>
                        <OldTouch
                            loading={false}
                            onPress={bookNow}
                            style={[styles.modalButtonStyle,{marginLeft:5,backgroundColor:colors.GREEN.bright}]}
                        >
                            <Text style={styles.modalButtonTextStyle}>{language.confirm}</Text>
                        </OldTouch>
                    </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
            </Modal>

        )
    }

    return (
        <View style={styles.mainViewStyle}>
            <NavigationEvents
                onWillFocus={payload => {
                }}
                onDidFocus={payload => {
                    pageActive.current = true;
                    if(!tripdata.pickup){

                    }
                }}
                onWillBlur={payload => {
                    pageActive.current = false;
                }}
                onDidBlur={payload => {
                }}
            />
            <Header
                backgroundColor={colors.GREY.default}
                leftComponent={{ icon: 'body-outline', type: 'ionicon', color: colors.BLACK, size: 28, component: TouchableWithoutFeedback, onPress: () => { props.navigation.toggleDrawer(); } }}
                centerComponent={<Text style={styles.headerTitleStyle}>{language.map_screen_title}</Text>}
                containerStyle={styles.headerStyle}
                innerContainerStyles={styles.headerInnerStyle}
            />

            <View style={styles.myViewStyle}>
                {/* <View style={styles.coverViewStyle}>
                    <View style={styles.viewStyle1} />
                    <View style={styles.viewStyle2} />
                    <View style={styles.viewStyle3} />
                </View> */}
                <View style={styles.iconsViewStyle}>
                    <TouchableOpacity onPress={() => tapAddress('pickup')} style={styles.contentStyle}>
                        <View style={styles.textIconStyle}>
                            <Text numberOfLines={1} style={[styles.textStyle, tripdata.selected == 'pickup' ? { fontSize: 20 } : { fontSize: 14 }]}>{tripdata.pickup && tripdata.pickup.add ? tripdata.pickup.add : language.map_screen_where_input_text}</Text>
                            <Icon
                               name='home'
                               color={colors.GREEN.default}
                               size={tripdata.selected == 'pickup' ? 28 : 18}
                                containerStyle={{ flex: 1 }}
                            />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => tapAddress('drop')} style={styles.searchClickStyle}>
                        <View style={styles.textIconStyle}>
                            <Text numberOfLines={1} style={[styles.textStyle, tripdata.selected == 'drop' ? { fontSize: 20 } : { fontSize: 14 }]}>{tripdata.drop && tripdata.drop.add ? tripdata.drop.add : language.map_screen_drop_input_text}</Text>
                            <Icon
                                name='chevrons-down'
                                type='feather'
                                color={colors.BLACK}
                                size={tripdata.selected == 'drop' ? 28 : 18}
                                containerStyle={{ flex: 1 }}
                            />
                        </View>
                    </TouchableOpacity>

                </View>
            </View>
            <View style={styles.mapcontainer}>
                {region && tripdata && tripdata.pickup && !locationRejected?
                    <MapComponent
                        markerRef={marker => { marker = marker; }}
                        mapStyle={styles.map}
                        mapRegion={region}
                        nearby={freeCars}
                        onRegionChangeComplete={onRegionChangeComplete}
                        onPanDrag={onPanDrag}
                    />
                : null}
                {region && !locationRejected?
                    tripdata.selected == 'pickup' ?
                        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                            <Image pointerEvents="none" style={{ marginBottom: 40, height: 40, resizeMode: "contain" }} source={require('../../assets/images/green_pin.png')} />
                        </View>
                        :
                        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                            <Image pointerEvents="none" style={{ marginBottom: 40, height: 40, resizeMode: "contain" }} source={require('../../assets/images/rsz_2red_pin.png')} />
                        </View>
                :null}
                {region && !locationRejected?
                <View  
                    
                    style={{ 
                        position: 'absolute', 
                        height: Platform.OS == 'ios'?55:42, 
                        width: Platform.OS == 'ios'?55:42, 
                        bottom: 11, 
                        right: 11, 

                        backgroundColor: '#fff', 
                        borderRadius: Platform.OS == 'ios'?30:3, 
                        elevation: 2,
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        shadowOffset: {
                            height: 0,
                            width: 0
                        },
                    }}
                >
                    <TouchableOpacity onPress={locateUser}
                        style={{ 
                            height: Platform.OS == 'ios'?55:42, 
                            width: Platform.OS == 'ios'?55:42,
                                alignItems: 'center', 
                            justifyContent: 'center', 
                        }}
                    >
                        <Icon
                            name='gps-fixed'
                            color={"#08313A"}
                            size={24}
                        />
                    </TouchableOpacity>
                </View>
                :null}
                {locationRejected?
                <View style={{flex:1,alignContent:'center',justifyContent:'center'}}>
                    <Text>{language.locationRejected}</Text>
                </View>
                :null}
            </View>
            { activeBookings && activeBookings.length>=1?
            <View style={styles.compViewStyle}>
                <ScrollView horizontal={true} pagingEnabled={true} showsHorizontalScrollIndicator={false}>
                    {activeBookings.map((booking, key) => {
                        return (
                        <TouchableWithoutFeedback key={key} style={styles.activeBookingItem} onPress={() => {
                            booking.status=='PAYMENT_PENDING'?
                            props.navigation.navigate('PaymentDetails', { booking: booking }):
                            props.navigation.navigate('BookedDelivery',{bookingId:booking.id});
                        }}>
                            <Image style={{marginLeft:10,width: 22, height: 22}} source={{ uri: booking.carImage }} resizeMode={'contain'}  />
                            <Text style={{marginLeft:10, width: 118, color:'red', fontFamily:'Ubuntu-Bold', fontSize:14}}>{language.active_booking}</Text>
                            <Text style={{marginLeft:0, width: width - 180,marginRight:10,color:colors.BLACK}} numberOfLines={1} ellipsizeMode='tail'>{booking.drop.add}</Text>           
                        </TouchableWithoutFeedback>
                        );
                    })}
                </ScrollView>
            </View>
            :null}
            <View style={styles.compViewStyle2}>
                <Text style={styles.sampleTextStyle}>{language.delivery_plans}</Text>
                <ScrollView horizontal={true} style={styles.adjustViewStyle} showsHorizontalScrollIndicator={true}>
                    {allCarTypes.map((prop, key) => {
                        return (
                            <View key={key} style={styles.cabDivStyle} >
                                <TouchableOpacity onPress={() => { selectCarType(prop, key) }} style={[styles.imageStyle, {
                                                                       backgroundColor: prop.active == true ? colors.GREEN.light : colors.WHITE
                                }]
                                }>
                                    <Image resizeMode="contain" source={prop.image ? { uri: prop.image } : require('../../assets/images/sample-package.png')} style={styles.imageStyle1} />
                                </TouchableOpacity>
                                <View style={styles.textViewStyle}>
                                    <Text style={styles.text1}>{prop.name.toUpperCase()}</Text>
                                    <View style={{flexDirection:'row',alignItems:'center'}}> 
                                        <Text style={styles.text2}>{prop.minTime != '' ? prop.minTime : language.not_available}</Text>
                                        {
                                        prop.extra_info && prop.extra_info !=''?
                                            <Tooltip style={{marginLeft:3, marginRight:3}}
                                                backgroundColor={"#fff"}
                                                overlayColor={'rgba(50, 50, 50, 0.70)'}
                                                height={45 + 30 * (prop.extra_info.split(',').length)}
                                                width={220}
                                                popover={
                                                    <View style={{ justifyContent:'space-around', flexDirection:'column'}}>
                                                        {
                                                        prop.extra_info.split(',').map((ln)=> <Text key={ln} >{ln}</Text> )
                                                        }
                                                    </View>
                                                }>
                                                <Icon
                                                    name='information-circle-outline'
                                                    type='ionicon'
                                                    color='#08313A'
                                                    size={27}
                                                />
                                            </Tooltip>
                                        :null}
                                    </View>
                                   
                                </View>
                            </View>

                        );
                    })}
                </ScrollView>
                <View style={{ flex: 0.5, flexDirection: 'row' }}>
                    <BaseButton
                        title={language.book_now_button}
                        loading={false}
                        onPress={onPressBookLater}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.GREY.iconPrimary, width: width / 2, elevation: 0 }}
                    >
                        <Text style={{ color: colors.BLACK, fontFamily: 'Ubuntu-Bold', fontSize: 18 }}>{language.book_later_button}</Text>
                    </BaseButton>
                    <BaseButton
                        title={language.book_now_button}
                        loading={false}
                        onPress={onPressBook}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.GREEN.light, width: width / 2, elevation: 0 }}
                    >
                        <Text style={{ color: colors.BLACK, fontFamily: 'Ubuntu-Bold', fontSize: 18 }}>{language.book_now_button}</Text>
                    </BaseButton>

                </View>

            </View>
            {LoadingModalBody()}
            {OptionModalBody()}
            {BookingModalBody()}
            <DateTimePickerModal
                date={pickerConfig.selectedDateTime}
                minimumDate={new Date()}
                isVisible={pickerConfig.dateModalOpen}
                mode={pickerConfig.dateMode}
                onConfirm={handleDateConfirm}
                onCancel={hideDatePicker}
            />
        </View>
    );

}

const styles = StyleSheet.create({
    headerStyle: {
        backgroundColor: colors.GREY.default,
        borderBottomWidth: 0
    },
    headerInnerStyle: {
        marginLeft: 10,
        marginRight: 10
    },
    headerTitleStyle: {
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 16
    },
    mapcontainer: {
        flex: 6,
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    mainViewStyle: {
        flex: 1,
        backgroundColor: colors.GREY.default,
    },
    myViewStyle: {
        flex: 1.5,
        flexDirection: 'row',
        borderTopWidth: 0,
        alignItems: 'center',
        backgroundColor: colors.GREY.default,
        paddingEnd: 20,
        paddingStart: 20
    },
    // coverViewStyle: {
    //     flex: 1.5,
    //     alignItems: 'center'
    // },

    //icon start point

    // viewStyle1: {
    //     height: 17,
    //     width: 17,
    //     borderRadius: 16 / 2,
    //     backgroundColor: colors.GREEN.light
        
    // },
    // viewStyle2: {
    //     height: height / 25,
    //     width: 1,
    //     backgroundColor: colors.BLACK
    // },
    // viewStyle3: {
    //     height: 17,
    //     width: 17,
    //     backgroundColor: colors.BLACK
    // },
    iconsViewStyle: {
        flex: 9.5,
        justifyContent: 'space-between'
    },
    contentStyle: {
        justifyContent: 'center',
        borderBottomColor: colors.BLACK,
        borderBottomWidth: 1
        
    },
    textIconStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    textStyle: {
        flex: 9,
        fontFamily: 'Ubuntu-Regular',
        fontSize: 14,
        fontWeight: '400',
        color: colors.BLACK,
        marginTop: 10,
        marginBottom: 10
    },
    searchClickStyle: {
        //flex: 1, 
        justifyContent: 'center'
    },
    compViewStyle: {
        flex: 0.8,
        backgroundColor: colors.GREEN.light,
        shadowColor: colors.BLACK,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 2,
    },
    activeBookingItem:{
        flex:1,
        flexGrow:1,
        flexDirection:'row',
        width:width,
        alignItems:'center',
        justifyContent:'flex-start'
    },
    compViewStyle2: {
        flex: 2.8,
        alignItems: 'center'
    },
    pickCabStyle: {
        flex: 0.3,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 14,
        fontWeight: '500',
        color: colors.BLACK
    },
    sampleTextStyle: {
        flex: 0.2,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 13,
        fontWeight: '300',
        color: colors.GREY.secondary,
        marginTop:5
    },
    adjustViewStyle: {
        flex: 9,
        flexDirection: 'row',
        //justifyContent: 'space-around',
        marginTop: 8
    },
    cabDivStyle: {
        flex: 1,
        width: width / 3,
        alignItems: 'center'
    },
    imageViewStyle: {
        flex: 2.7,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    imageStyle: {
        height: height / 18,
        width: height / 10,
        padding:5,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom:5
    },
    imageStyle1: {
        height: height / 20,
        width: height / 14
    },
    textViewStyle: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    text1: {

        fontFamily: 'Ubuntu-Bold',
        fontSize: 14,
        fontWeight: '900',
        color: colors.BLACK
    },
    text2: {
        fontFamily: 'Ubuntu-Regular',
        fontSize: 12,
        fontWeight: '500',
        color: colors.GREEN.medium
    },
    imagePosition: {
        height: height / 14,
        width: height / 14,
        borderRadius: height / 14 / 2,
        borderWidth: 3,
        borderColor: colors.GREEN.medium,
        //backgroundColor: colors.GREEN.medium, 
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageStyleView: {
        height: height / 14,
        width: height / 14,
        borderRadius: height / 14 / 2,
        borderWidth: 3,
        borderColor: colors.GREEN.medium,
        justifyContent: 'center',
        alignItems: 'center'
    },    

    imageStyle2: {
        height: height / 20.5,
        width: height / 20.5
    },
    buttonContainer: {
        flex: 1
    },

    buttonTitleText: {
        color: colors.GREY.default,
        fontFamily: 'Ubuntu-Regular',
        fontSize: 20,
        alignSelf: 'flex-end'
    },

    cancelButtonStyle: {
        backgroundColor: colors.GREY.whiteish,
        elevation: 0,
        width: "60%",
        borderRadius: 5,
        alignSelf: "center"
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(22,22,22,0.8)"
    },
    modalView: {
        margin: 20,
        backgroundColor: "#F2F1F0",
        borderRadius: 20,
        paddingLeft: 25,
        paddingRight: 50,
        paddingTop:30,
        paddingBottom:30,
        alignItems: "flex-start",
        shadowColor: "#08313A",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
      },
      textInputContainerStyle: {
        flexDirection: 'row',
        alignItems: "center"
    },
    inputContainerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: colors.BLACK
    },
    textInputStyle: {
    },
    modalButtonStyle: {   
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.GREY.Smoke_Grey, 
        width: 100, 
        height:40,  
        elevation: 0,
        borderRadius: 10
    },
    modalButtonTextStyle: {   
        color: colors.WHITE, 
        fontFamily: 'Ubuntu-Bold', 
        fontSize: 18 
    },
    rateViewStyle: {
        alignItems: 'center',
        alignSelf:'center',
        marginBottom: 15
    },
    rateViewTextStyle: {
        fontSize: 36,
        color: colors.GREEN.bright,
        fontFamily: 'Ubuntu-Bold',
        fontWeight: 'bold',
        textAlign: "center"
    }
});