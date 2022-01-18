import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    StyleSheet,
    View,
    Image,
    Dimensions,
    TouchableOpacity,
    Text,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    Linking,
    Alert,
    ImageBackground
} from 'react-native';
import { TouchableOpacity as OldTouch } from 'react-native';
import { Icon, Button, Header, Input } from 'react-native-elements';
import MapView, { PROVIDER_GOOGLE, Marker, AnimatedRegion } from 'react-native-maps';
import { OtpModal } from '../components';
import StarRating from 'react-native-star-rating';
import RadioForm from 'react-native-simple-radio-button';
import { colors } from '../common/theme';
var { width, height } = Dimensions.get('window');
import { language } from 'config';
import { useSelector, useDispatch } from 'react-redux';
import { NavigationEvents } from 'react-navigation';
import Polyline from '@mapbox/polyline';
import getDirections from 'react-native-google-maps-directions';
import scooterIcon from '../../assets/images/pickupscooter.png';
import { FirebaseContext } from 'common/src';
import * as ImagePicker from 'expo-image-picker';

export default function BookedDelivery(props) {
    const { api } = useContext(FirebaseContext);
    const {
        fetchBookingLocations,
        stopLocationFetch,
        updateBookingImage,
        cancelBooking,
        updateBooking,
        getRouteDetails
    } = api;
    const dispatch = useDispatch();
    const bookingId = props.navigation.getParam('bookingId');
    const latitudeDelta = 0.043;
    const longitudeDelta = 0.034;
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const activeBookings = useSelector(state => state.bookinglistdata.active);
    const [curBooking, setCurBooking] = useState(null);
    const cancelReasons = useSelector(state => state.cancelreasondata.complex);
    const role = useSelector(state => state.auth.info.profile.usertype);
    const [cancelReasonSelected, setCancelReasonSelected] = useState(0);
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const lastLocation = useSelector(state => state.locationdata.coords);
    const [liveRouteCoords, setLiveRouteCoords] = useState(null);
    const mapRef = useRef();
    const pageActive = useRef(false);
    const [lastCoords, setlastCoords] = useState();
    const [arrivalTime, setArrivalTime] = useState(0);
    const [loading, setLoading] = useState(false);
    const [purchaseInfoModalStatus, setPurchaseInfoModalStatus] = useState(false);


    useEffect(() => {
        setInterval(() => {
            if (pageActive.current && curBooking && lastLocation && (curBooking.status == 'ACCEPTED' || curBooking.status == 'STARTED')) {
                if (lastCoords && lastCoords.lat != lastLocation.lat && lastCoords.lat != lastLocation.lng) {
                    if (curBooking.status == 'ACCEPTED') {
                        let point1 = { lat: lastLocation.lat, lng: lastLocation.lng };
                        let point2 = { lat: curBooking.pickup.lat, lng: curBooking.pickup.lng };
                        fitMap(point1, point2);
                    } else {
                        let point1 = { lat: lastLocation.lat, lng: lastLocation.lng };
                        let point2 = { lat: curBooking.drop.lat, lng: curBooking.drop.lng };
                        fitMap(point1, point2);
                    }
                    setlastCoords(lastLocation);
                }
            }
        }, 20000);
    }, []);

    useEffect(() => {
        if (lastLocation && curBooking && curBooking.status == 'ACCEPTED') {
            let point1 = { lat: lastLocation.lat, lng: lastLocation.lng };
            let point2 = { lat: curBooking.pickup.lat, lng: curBooking.pickup.lng };
            fitMap(point1, point2);
            setlastCoords(lastLocation);
        }

        if (curBooking && curBooking.status == 'ARRIVED') {
            setlastCoords(null);
            setTimeout(() => {
                mapRef.current.fitToCoordinates([{ latitude: curBooking.pickup.lat, longitude: curBooking.pickup.lng }, { latitude: curBooking.drop.lat, longitude: curBooking.drop.lng }], {
                    edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                    animated: true,
                })
            }, 1000);
        }
        if (lastLocation && curBooking && curBooking.status == 'STARTED') {
            let point1 = { lat: lastLocation.lat, lng: lastLocation.lng };
            let point2 = { lat: curBooking.drop.lat, lng: curBooking.drop.lng };
            fitMap(point1, point2);
            setlastCoords(lastLocation);
        }
        if (lastLocation && curBooking && curBooking.status == 'REACHED' && role == 'dispatcher') {
            setTimeout(() => {
                mapRef.current.fitToCoordinates([{ latitude: curBooking.pickup.lat, longitude: curBooking.pickup.lng }, { latitude: lastLocation.lat, longitude: lastLocation.lng }], {
                    edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                    animated: true,
                })
            }, 1000);
        }
    }, [lastLocation, curBooking])

    const fitMap = (point1, point2) => {
        let startLoc = '"' + point1.lat + ',' + point1.lng + '"';
        let destLoc = '"' + point2.lat + ',' + point2.lng + '"';
        getRouteDetails(Platform.OS, startLoc, destLoc).then((details) => {
            setArrivalTime(details.duration ? parseFloat(details.duration / 60).toFixed(0) : 0);
            let points = Polyline.decode(details.polylinePoints);
            let coords = points.map((point, index) => {
                return {
                    latitude: point[0],
                    longitude: point[1]
                }
            })
            setLiveRouteCoords(coords);
            mapRef.current.fitToCoordinates([{ latitude: point1.lat, longitude: point1.lng }, { latitude: point2.lat, longitude: point2.lng }], {
                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                animated: true,
            })
        });
    }


    useEffect(() => {

        if (activeBookings && activeBookings.length >= 1) {
            let booking = activeBookings.filter(booking => booking.id == bookingId)[0];
            if (booking) {
                setCurBooking(booking);
                if (booking.status == 'NEW') {
                    if (role == 'dispatcher') setSearchModalVisible(true);
                }
                if (booking.status == 'ACCEPTED') {
                    if (role == 'dispatcher') setSearchModalVisible(false);
                    if (role == 'dispatcher') dispatch(fetchBookingLocations(bookingId));
                }
                if (booking.status == 'ARRIVED') {
                    if (role == 'dispatcher') dispatch(fetchBookingLocations(bookingId));
                }
                if (booking.status == 'STARTED') {
                    if (role == 'dispatcher') dispatch(fetchBookingLocations(bookingId));
                }
                if (booking.status == 'REACHED') {
                    if (role == 'driver') {
                        if (booking.prepaid) {
                            booking.status = 'PAID';
                            dispatch(updateBooking(booking));
                        } else {
                            props.navigation.navigate('PaymentDetails', { booking: booking });
                        }
                    } else {
                        dispatch(stopLocationFetch(bookingId));
                    }
                }
                if (booking.status == 'PENDING') {
                    if (role == 'dispatcher') props.navigation.navigate('PaymentDetails', { booking: booking });
                }
                if (booking.status == 'PAID') {
                    if (role == 'dispatcher') props.navigation.navigate('DriverRating', { booking: booking });
                    if (role == 'driver') props.navigation.navigate('DriverTrips');
                }
                if ((booking.status == 'ACCEPTED' || booking.status == 'ARRIVED') && booking.pickup_image) {
                    setLoading(false);
                }
                if (booking.status == 'STARTED' && booking.deliver_image) {
                    setLoading(false);
                }
            }
            else {
                setModalVisible(false);
                setSearchModalVisible(false);
                props.navigation.navigate('RideList');
            }
        }
        else {
            setModalVisible(false);
            setSearchModalVisible(false);
            if (role == 'driver') {
                props.navigation.navigate('DriverTrips');
            } else {
                props.navigation.navigate('RideList');
            }
        }
    }, [activeBookings]);

    const renderButtons = () => {
        return (
            (curBooking && role == 'dispatcher' && (curBooking.status == 'NEW' || curBooking.status == 'ACCEPTED')) ||
                (curBooking && role == 'driver' && (curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED' || curBooking.status == 'STARTED')) ?
                <View style={{ flex: 1.5, flexDirection: 'row' }}>
                    {(role == 'dispatcher' && !curBooking.pickup_image && (curBooking.status == 'NEW' || curBooking.status == 'ACCEPTED')) ||
                        (role == 'driver' && !curBooking.pickup_image && (curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED')) ?
                        <View style={{ flex: 1 }}>
                            <Button
                                title={language.cancel_ride}
                                loading={false}
                                loadingProps={{ size: "large", color: colors.WHITE }}
                                titleStyle={{ color: colors.BLACK, fontWeight: 'REGULAR' }}
                                onPress={() => {
                                    role == 'dispatcher' ?
                                        setModalVisible(true) :
                                        Alert.alert(
                                            language.alert,
                                            language.cancel_confirm,
                                            [
                                                { text: language.cancel, onPress: () => console.log('NO Pressed'), style: 'cancel' },
                                                { text: language.ok, onPress: () => dispatch(cancelBooking({ booking: curBooking, reason: language.driver_cancelled_booking })) },
                                            ]
                                        );
                                }
                                }
                                buttonStyle={{ height: '100%', backgroundColor: colors.GREY.Deep_Nobel }}
                                containerStyle={{ height: '100%' }}
                            />
                        </View>
                        : null}
                    {role == 'driver' && !curBooking.pickup_image && (curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED') ?
                        <View style={{ flex: 1 }}>
                            <Button
                                title={language.take_pickup_image}
                                loading={loading}
                                loadingProps={{ size: "large", color: colors.BLACK }}
                                onPress={() => _pickImage(ImagePicker.launchCameraAsync)}
                                buttonStyle={{ height: '100%', backgroundColor: colors.GREEN.medium}}
                                containerStyle={{ height: '100%' }}
                            />
                        </View>
                        : null}
                    {role == 'driver' && curBooking.pickup_image && (curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED') ?
                        <View style={{ flex: 1 }}>
                            <Button
                                title={language.start_trip}
                                loading={false}
                                loadingProps={{ size: "large", color: colors.WHITE }}
                                titleStyle={{ color: colors.WHITE, fontWeight: 'bold' }}
                                onPress={() => {
                                    startBooking();
                                }}
                                buttonStyle={{ height: '100%', backgroundColor: colors.GREEN.medium }}
                                containerStyle={{ height: '100%' }}
                            />
                        </View>
                        : null}

                    {role == 'driver' && !curBooking.deliver_image && curBooking.status == 'STARTED' ?
                        <View style={{ flex: 1 }}>
                            <Button
                                title={language.take_deliver_image}
                                loading={loading}
                                loadingProps={{ size: "large", color: colors.WHITE }}
                                titleStyle={{ color: colors.WHITE, fontWeight: 'bold' }}
                                onPress={() => _pickImage(ImagePicker.launchCameraAsync)}
                                buttonStyle={{ height: '100%', backgroundColor: colors.GREEN.medium }}
                                containerStyle={{ height: '100%' }}
                            />
                        </View>
                        : null}
                    {role == 'driver' && curBooking.deliver_image && curBooking.status == 'STARTED' ?
                        <View style={{ flex: 1 }}>
                            <Button
                                title={language.complete_ride}
                                loading={false}
                                titleStyle={{ color: colors.WHITE, fontWeight: 'bold' }}
                                onPress={() => {
                                    if (curBooking.otp) {
                                        setOtpModalVisible(true);
                                    } else {
                                        endBooking();
                                    }
                                }}
                                buttonStyle={{ height: '100%', backgroundColor: colors.GREEN.medium }}
                                containerStyle={{ height: '100%' }}
                            />
                        </View>
                        : null}
                </View>
                : null
        );
    }

    const startBooking = () => {
        setOtpModalVisible(false);
        let booking = { ...curBooking };
        booking.status = 'STARTED';
        dispatch(updateBooking(booking));
    }

    const endBooking = () => {
        let booking = { ...curBooking };
        booking.status = 'REACHED';
        dispatch(updateBooking(booking));
        setOtpModalVisible(false);
    }

    const startNavigation = () => {
        const params = [
            {
                key: "travelmode",
                value: "driving"
            },
            {
                key: "dir_action",
                value: "navigate"
            }
        ];
        let data = null;
        try {
            if (curBooking.status == 'ACCEPTED') {
                data = {
                    source: {
                        latitude: lastLocation.lat,
                        longitude: lastLocation.lng
                    },
                    destination: {
                        latitude: curBooking.pickup.lat,
                        longitude: curBooking.pickup.lng
                    },
                    params: params,
                }
            }
            if (curBooking.status == 'STARTED') {
                data = {
                    source: {
                        latitude: lastLocation.lat,
                        longitude: lastLocation.lng
                    },
                    destination: {
                        latitude: curBooking.drop.lat,
                        longitude: curBooking.drop.lng
                    },
                    params: params,
                }
            }

            if (data && data.source.latitude) {
                getDirections(data);
            } else {
                Alert.alert(language.alert, language.navigation_available);
            }


        } catch (error) {
            console.log(error);
            Alert.alert(language.alert, language.location_error);
        }

    }

    //ride cancel confirm modal design
    const alertModal = () => {
        return (
            <Modal
                animationType="none"
                transparent={true}
                visible={alertModalVisible}
                onRequestClose={() => {
                    setAlertModalVisible(false);
                }}>
                <View style={styles.alertModalContainer}>
                    <View style={styles.alertModalInnerContainer}>

                        <View style={styles.alertContainer}>

                            <Text style={styles.rideCancelText}>{language.dispatcher_cancel_text}</Text>

                            <View style={styles.horizontalLLine} />

                            <View style={styles.msgContainer}>
                                <Text style={styles.cancelMsgText}>{language.cancel_messege1}  {bookingId} {language.cancel_messege2} </Text>
                            </View>
                            <View style={styles.okButtonContainer}>
                                <Button
                                    title={language.no_driver_found_alert_OK_button}
                                    titleStyle={styles.signInTextStyle}
                                    onPress={() => {
                                        setAlertModalVisible(false);
                                        props.navigation.popToTop();
                                    }}
                                    buttonStyle={styles.okButtonStyle}
                                    containerStyle={styles.okButtonContainerStyle}
                                />
                            </View>

                        </View>

                    </View>
                </View>

            </Modal>
        )
    }

    const cancelModal = () => {
        return (
            <Modal
                animationType="none"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                }}>
                <View style={styles.cancelModalContainer}>
                    <View style={styles.cancelModalInnerContainer}>

                        <View style={styles.cancelContainer}>
                            <View style={styles.cancelReasonContainer}>
                                <Text style={styles.cancelReasonText}>{language.cancel_reason_modal_title}</Text>
                            </View>

                            <View style={styles.radioContainer}>
                                <RadioForm
                                    radio_props={cancelReasons}
                                    initial={0}
                                    animation={false}
                                    buttonColor={colors.GREY.secondary}
                                    selectedButtonColor={colors.GREEN.medium}
                                    buttonSize={10}
                                    buttonOuterSize={20}
                                    style={styles.radioContainerStyle}
                                    labelStyle={styles.radioText}
                                    radioStyle={styles.radioStyle}
                                    onPress={(value) => { setCancelReasonSelected(value) }}
                                />
                            </View>
                            <View style={styles.cancelModalButtosContainer}>
                                <Button
                                    title={language.dont_cancel_text}
                                    titleStyle={styles.signInTextStyle}
                                    onPress={() => { setModalVisible(false) }}
                                    buttonStyle={styles.cancelModalButttonStyle}
                                    containerStyle={styles.cancelModalButtonContainerStyle}
                                />

                                <View style={styles.buttonSeparataor} />

                                <Button
                                    title={language.no_driver_found_alert_OK_button}
                                    titleStyle={styles.signInTextStyle}
                                    onPress={() => {
                                        if (cancelReasonSelected >= 0) {
                                            dispatch(cancelBooking({ booking: curBooking, reason: cancelReasons[cancelReasonSelected].label }));
                                        } else {
                                            Alert.alert(language.alert, language.select_reason);
                                        }
                                    }}
                                    buttonStyle={styles.cancelModalButttonStyle}
                                    containerStyle={styles.cancelModalButtonContainerStyle}
                                />
                            </View>

                        </View>


                    </View>
                </View>

            </Modal>
        )
    }


    const searchModal = () => {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={searchModalVisible}
                onRequestClose={() => {
                    setSearchModalVisible(false)
                }}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(22,22,22,0.7)", justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '70%', backgroundColor: "#ffffff", borderRadius: 20, justifyContent: 'center', alignItems: 'center', flex: 1, maxHeight: 310 }}>
                        <View style={{ marginTop: 15 }}>
                            <Image source={require('../../assets/images/searchdriver.gif')} resizeMode={'contain'} style={{ width: 200, height: 200, marginTop: 15 }} />
                            <View><Text style={{ color: colors.BLACK, fontSize: 16, marginTop: 12 }}>{language.driver_assign_message}</Text></View>
                            <View style={styles.buttonContainer}>
                                <Button
                                    title={language.close}
                                    loading={false}
                                    loadingProps={{ size: "large", color: colors.BLACK }}
                                    titleStyle={styles.buttonTitleText}
                                    onPress={() => { setSearchModalVisible(false) }}
                                    buttonStyle={styles.cancelButtonStyle}
                                    containerStyle={{ marginTop: 30 }}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    const chat = () => {
        props.navigation.navigate("onlineChat", { bookingId: bookingId })
    }

    const onPressCall = (phoneNumber) => {
        let call_link = Platform.OS == 'android' ? 'tel:' + phoneNumber : 'telprompt:' + phoneNumber;
        Linking.canOpenURL(call_link).then(supported => {
            if (supported) {
                return Linking.openURL(call_link);
            } else {
                console.log("Unable to call");
            }
        }).catch(err => console.error('An error occurred', err));
    }

    const _pickImage = async (res) => {
        var pickFrom = res;

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status == 'granted') {
            let result = await pickFrom({
                allowsEditing: true,
                aspect: [3, 3],
                base64: true
            });

            if (!result.cancelled) {
                let data = 'data:image/jpeg;base64,' + result.base64;
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
                    setLoading(true);
                    dispatch(updateBookingImage(curBooking,
                        curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED' ? 'pickup_image' : 'deliver_image',
                        blob));
                }
            }
        }
    };

    const PurchaseInfoModal = () => {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={purchaseInfoModalStatus}
                onRequestClose={() => {
                    setPurchaseInfoModalStatus(false);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.parcel_type}</Text>
                            <Text style={styles.textContent}>
                                {curBooking && curBooking.parcelTypeSelected? curBooking.parcelTypeSelected.description : ''}
                            </Text>
                        </View>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.deliveryPerson}</Text>
                            <Text style={styles.textContent}>
                                {curBooking? curBooking.deliveryPerson : ''}
                            </Text>
                        </View>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.deliveryPersonPhone}</Text>
                            <Text style={styles.textContent}>
                                {curBooking? curBooking.deliveryPersonPhone : ''}
                            </Text>
                        </View>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.options}</Text>
                            <Text style={styles.textContent}>
                                {curBooking && curBooking.optionSelected? curBooking.optionSelected.description : ''}
                            </Text>
                        </View>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.pickUpInstructions}</Text>
                            <Text style={styles.textContent}>
                                {curBooking? curBooking.pickUpInstructions : ''}
                            </Text>
                        </View>
                        <View style={styles.textContainerStyle}>
                            <Text style={styles.textHeading}>{language.deliveryInstructions}</Text>
                            <Text style={styles.textContent}>
                                {curBooking? curBooking.deliveryInstructions : ''}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignSelf: 'center', height: 40 }}>
                            <OldTouch
                                loading={false}
                                onPress={() => setPurchaseInfoModalStatus(false)}
                                style={styles.modalButtonStyle}
                            >
                                <Text style={styles.modalButtonTextStyle}>{language.ok}</Text>
                            </OldTouch>
                        </View>
                    </View>
                </View>
            </Modal>

        )
    }

    return (
        <View style={styles.mainContainer}>
            <NavigationEvents
                onWillBlur={payload => {
                    pageActive.current = false;
                    if (role == 'dispatcher') {
                        dispatch(stopLocationFetch(bookingId));
                    }
                }}
                onDidFocus={payload => {
                    pageActive.current = true;
                }}
            />
            <Header
                backgroundColor={colors.GREY.default}
                leftComponent={{ icon: 'body-outline', type: 'ionicon', color: colors.BLACK, size: 28, component: TouchableWithoutFeedback, onPress: () => { props.navigation.toggleDrawer(); } }}
                centerComponent={<Text style={styles.headerTitleStyle}>{language.confirmed_delivery_title}</Text>}
                containerStyle={styles.headerStyle}
                innerContainerStyles={styles.headerInnerStyle}
            />
            <View style={styles.topContainer}>
                {/* <View style={styles.topLeftContainer}>
                    <View style={styles.circle} />
                    <View style={styles.staightLine} />
                    <View style={styles.square} />
                </View> */}
                <View style={styles.topRightContainer}>
                    <TouchableOpacity style={styles.whereButton}>
                        <View style={styles.whereContainer}>
                            <Text numberOfLines={1} style={styles.whereText}>{curBooking ? curBooking.pickup.add : ""}</Text>
                            <Icon
                                name='home'
                                color={colors.GREEN.default}
                                size={25}
                                containerStyle={styles.iconContainer}
                            />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropButton}>
                        <View style={styles.whereContainer}>
                            <Text numberOfLines={1} style={styles.whereText}>{curBooking ? curBooking.drop.add : ""}</Text>
                            <Icon
                                name='chevrons-down'
                                type='feather'
                                color={colors.BLACK}
                                size={25}
                                containerStyle={styles.iconContainer}
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.mapcontainer}>
                {curBooking ?
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={{
                            latitude: curBooking.pickup.lat,
                            longitude: curBooking.pickup.lng,
                            latitudeDelta: latitudeDelta,
                            longitudeDelta: longitudeDelta
                        }}
                    >

                        {(curBooking.status == 'ACCEPTED' || curBooking.status == 'ARRIVED' || curBooking.status == 'STARTED') && lastLocation ?
                            <Marker.Animated
                                coordinate={new AnimatedRegion({
                                    latitude: lastLocation.lat,
                                    longitude: lastLocation.lng,
                                    latitudeDelta: latitudeDelta,
                                    longitudeDelta: longitudeDelta
                                })}
                            >
                                <Image
                                    source={scooterIcon}
                                    style={{ height: 60, width: 60 }}
                                />
                            </Marker.Animated>
                            : null}

                        <Marker
                            coordinate={{ latitude: (curBooking.pickup.lat), longitude: (curBooking.pickup.lng) }}
                            title={curBooking.pickup.add}
                            pinColor={colors.GREEN.default}
                            
                        />
                        <Marker
                            coordinate={{ latitude: (curBooking.drop.lat), longitude: (curBooking.drop.lng) }}
                            title={curBooking.drop.add}
                        />

                        {liveRouteCoords && (curBooking.status == 'ACCEPTED' || curBooking.status == 'STARTED') ?
                            <MapView.Polyline
                                coordinates={liveRouteCoords}
                                strokeWidth={5}
                                strokeColor={colors.BLACK}
                            />
                            : null}

                        {curBooking.status == 'ARRIVED' || curBooking.status == 'REACHED' ?
                            <MapView.Polyline
                                coordinates={curBooking.coords}
                                strokeWidth={5}
                                strokeColor={colors.BLACK}
                            />
                            : null}
                    </MapView>
                    : null}
                {role == 'driver' ?
                    <TouchableOpacity
                        style={[styles.floatButton, { bottom: 220 }]}
                        onPress={() => setPurchaseInfoModalStatus(true)}
                    >
                        <Icon
                            name="ios-information-circle"
                            type="ionicon"
                            size={32}
                            color={colors.WHITE}
                        />
                    </TouchableOpacity>
                    : null}
                {role == 'driver' ?
                    <TouchableOpacity
                        style={[styles.floatButton, { bottom: 150 }]}
                        onPress={() =>
                            startNavigation()
                        }
                    >
                        <Icon
                            name="ios-navigate"
                            type="ionicon"
                            size={30}
                            color={colors.WHITE}
                        />
                    </TouchableOpacity>
                    : null}
                <TouchableOpacity
                    style={[styles.floatButton, { bottom: 80 }]}
                    onPress={() => chat()}
                >
                    <Icon
                        name="ios-chatbubbles"
                        type="ionicon"
                        size={30}
                        color={colors.WHITE}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.floatButton, { bottom: 10 }]}
                    onPress={() =>
                        role == 'dispatcher' ? onPressCall(curBooking.driver_contact) : onPressCall(curBooking.deliveryPersonPhone)
                    }
                >
                    <Icon
                        name="ios-call"
                        type="ionicon"
                        size={30}
                        color={colors.WHITE}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.bottomContainer}>

                <View style={styles.otpContainer}>
                    <Text style={styles.cabText}>{language.booking_status}: <Text style={styles.cabBoldText}>{curBooking && curBooking.status ? language[curBooking.status] : null} {curBooking && curBooking.status == 'ACCEPTED' ? '( ' + arrivalTime + ' ' + language.mins + ' )' : ''}</Text></Text>
                    {role == 'dispatcher' ? <Text style={styles.otpText}>{curBooking ? language.proofotp + curBooking.otp : null}</Text> : null}

                </View>
                <View style={styles.cabDetailsContainer}>
                    {curBooking && curBooking.status == "NEW" ?
                        <ImageBackground source={require('../../assets/images/footer-mob.jpg')} resizeMode='stretch'
                            style={{ flex: 1, width: width, height: undefined, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Text style={{ fontSize: 18, marginBottom: 10, color:"#5CD85A" }}>{language.searching}</Text>
                            <Image style={{ width: 40, height: 40, marginBottom: 10, marginRight: 20 }} source={require('../../assets/images/searchbottom.gif')} />
                        </ImageBackground>
                        : null}
                    {curBooking && curBooking.status != "NEW" ?
                        <View style={styles.cabDetails}>
                            <View style={styles.cabName}>
                                <Text style={styles.cabNameText}>{curBooking.carType}</Text>
                            </View>

                            <View style={styles.cabPhoto}>
                                <Image source={{ uri: curBooking.carImage }} resizeMode={'contain'} style={styles.cabImage} />
                            </View>

                            <View style={styles.cabNumber}>
                                <Text style={styles.cabNumberText}>{curBooking.vehicle_number}</Text>
                            </View>

                        </View>
                        : null}
                    {curBooking && curBooking.status != "NEW" ?
                        <View style={styles.verticalDesign}>
                            <View style={styles.triangle} />
                            <View style={styles.verticalLine} />
                        </View>
                        : null}
                    {curBooking && curBooking.status != "NEW" ?
                        <View style={styles.driverDetails}>
                            <View style={styles.driverPhotoContainer}>
                                {role == 'dispatcher' ?
                                    <Image source={curBooking.driver_image ? { uri: curBooking.driver_image } : require('../../assets/images/profilePic.png')} style={styles.driverPhoto} />
                                    :
                                    <Image source={curBooking.customer_image ? { uri: curBooking.customer_image } : require('../../assets/images/profilePic.png')} style={styles.driverPhoto} />
                                }
                            </View>
                            <View style={styles.driverNameContainer}>
                                {role == 'dispatcher' ?
                                    <Text style={styles.driverNameText}>{curBooking.driver_name}</Text>
                                    :
                                    <Text style={styles.driverNameText}>{curBooking.customer_name}</Text>
                                }
                            </View>

                            <View style={styles.ratingContainer}>
                                {role == 'dispatcher' ?
                                    <StarRating
                                        disabled={true}
                                        maxStars={5}
                                        starSize={height / 42}
                                        fullStar={'ios-star'}
                                        halfStar={'ios-star-half'}
                                        emptyStar={'ios-star-outline'}
                                        iconSet={'Ionicons'}
                                        fullStarColor={colors.GREEN.medium}
                                        emptyStarColor={colors.BLACK}
                                        halfStarColor={colors.GREEN.medium}
                                        rating={parseInt(curBooking.driverRating)}
                                        containerStyle={styles.ratingContainerStyle}
                                    />
                                    : null}
                            </View>

                        </View>
                        : null}
                </View>
                {
                    renderButtons()
                }
            </View>
            {
                PurchaseInfoModal()
            }
            {
                cancelModal()
            }
            {
                alertModal()
            }
            {
                searchModal()
            }
            <OtpModal
                modalvisable={otpModalVisible}
                requestmodalclose={() => { setOtpModalVisible(false) }}
                otp={curBooking ? curBooking.otp : ''}
                onMatch={(value) => value ? endBooking() : null}
            />
        </View>
    );

}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.WHITE },
    headerStyle: {
        backgroundColor: colors.GREY.default,
        borderBottomWidth: 0,
    },
    headerInnerStyle: {
        marginLeft: 10,
        marginRight: 10
    },
    headerTitleStyle: {
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 18
    },
    cancelButtonStyle:{
        backgroundColor: colors.BLACK,
        color: colors.WHITE,
    },
    topContainer: { flex: 1.5, flexDirection: 'row', borderTopWidth: 0, alignItems: 'center', backgroundColor: colors.WHITE, paddingEnd: 20,paddingStart: 20 },
    topLeftContainer: {
        flex: 1.5,
        alignItems: 'center'
    },
    topRightContainer: {
        flex: 9.5,
        justifyContent: 'space-between',
    },
    circle: {
        height: 15,
        width: 15,
        borderRadius: 15 / 2,
        backgroundColor: colors.GREEN.light
    },
    staightLine: {
        height: height / 25,
        width: 1,
        backgroundColor: colors.BLACK
    },
    square: {
        height: 17,
        width: 17,
        backgroundColor: colors.BLACK
    },
    whereButton: { flex: 1, justifyContent: 'center', borderBottomColor: colors.BLACK, borderBottomWidth: 1 },
    whereContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    whereText: { flex: 9, fontFamily: 'Ubuntu-Regular', fontSize: 14, fontWeight: '400', color: colors.BLACK },
    iconContainer: { flex: 1 },
    dropButton: { flex: 1, justifyContent: 'center' },
    mapcontainer: {
        flex: 7,
        width: width
    },
    bottomContainer: { flex: 2.5, alignItems: 'center' },
    map: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    otpContainer: 
    { flex: 1.6, 
        backgroundColor: colors.GREEN.light,
        shadowColor: colors.BLACK,
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        width: width, 
        flexDirection: 'row', 
        justifyContent: 'space-between' },


    cabText: { paddingLeft: 6, alignSelf: 'center', color: colors.BLACK, fontFamily: 'Ubuntu-Regular' },
    cabBoldText: { fontFamily: 'Ubuntu-Bold' },
    otpText: { paddingRight: 6, alignSelf: 'center', color: colors.BLACK, fontFamily: 'Ubuntu-Regular' },
    cabDetailsContainer: { flex: 2.5, backgroundColor: colors.WHITE, flexDirection: 'row', position: 'relative', zIndex: 1 },
    cabDetails: { flex: 19 },
    cabName: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    cabNameText: { color: colors.GREY.btnPrimary, fontFamily: 'Ubuntu-Bold', fontSize: 13 },
    cabPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cabImage: { width:100, height: height / 20, marginBottom: 7, marginTop: 7 },
    cabNumber: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cabNumberText: { color: colors.GREY.iconSecondary, fontFamily: 'Ubuntu-Bold', fontSize: 13 },
    verticalDesign: { flex: 2, height: 50, width: 1, alignItems: 'center' },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: colors.TRANSPARENT,
        borderStyle: 'solid',
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: 10,
        borderLeftColor: colors.TRANSPARENT,
        borderRightColor: colors.TRANSPARENT,
        borderBottomColor: colors.GREEN.light,
        transform: [
            { rotate: '180deg' }
        ],

        marginTop: -1,
        overflow: 'visible'
    },
    verticalLine: { height: height / 20, width: 0.7, backgroundColor: colors.BLACK, alignItems: 'center', marginTop: 10 },
    driverDetails: { flex: 19, alignItems: 'center', justifyContent: 'center' },
    driverPhotoContainer: { flex: 5.6, justifyContent: 'flex-end', alignItems: 'center' },
    driverPhoto: { borderRadius: height / 20 / 2, width: height / 20, height: height / 20 },
    driverNameContainer: { flex: 2.2, alignItems: 'center', justifyContent: 'center' },
    driverNameText: { color: colors.GREY.btnPrimary, fontFamily: 'Ubuntu-Bold', fontSize: 12 },
    ratingContainer: { flex: 2.5, alignItems: 'center', justifyContent: 'center' },
    ratingContainerStyle: { marginTop: 0, paddingBottom: Platform.OS == 'android' ? 5 : 0 },

    //alert modal
    alertModalContainer: { flex: 1, justifyContent: 'center', backgroundColor: colors.GREY.background },
    alertModalInnerContainer: { height: 200, width: (width * 0.85), backgroundColor: colors.WHITE, alignItems: 'center', alignSelf: 'center', borderRadius: 7 },
    alertContainer: { flex: 2, justifyContent: 'space-between', width: (width - 100) },
    rideCancelText: { flex: 1, top: 15, color: colors.GREEN.light, fontFamily: 'Ubuntu-Bold', fontSize: 20, alignSelf: 'center' },
    horizontalLLine: { width: (width - 110), height: 0.5, backgroundColor: colors.BLACK, alignSelf: 'center', },
    msgContainer: { flex: 2.5, alignItems: 'center', justifyContent: 'center' },
    cancelMsgText: { color: colors.BLACK, fontFamily: 'Ubuntu-Regular', fontSize: 15, alignSelf: 'center', textAlign: 'center' },
    okButtonContainer: { flex: 1, width: (width * 0.85), flexDirection: 'row', backgroundColor: colors.GREY.iconSecondary, alignSelf: 'center' },
    okButtonStyle: { flexDirection: 'row', backgroundColor: colors.BLACK, alignItems: 'center', justifyContent: 'center' },
    okButtonContainerStyle: { flex: 1, width: (width * 0.85), backgroundColor: colors.GREY.iconSecondary, },

    //cancel modal
    cancelModalContainer: { flex: 1, justifyContent: 'center', backgroundColor: colors.GREY.background },
    cancelModalInnerContainer: { height: 400, width: width * 0.85, padding: 0, backgroundColor: colors.WHITE, alignItems: 'center', alignSelf: 'center', borderRadius: 7 },
    cancelContainer: { flex: 1, justifyContent: 'space-between', width: (width * 0.85) },
    cancelReasonContainer: { flex: 1 },
    cancelReasonText: { top: 10, color: colors.BLACK, fontFamily: 'Ubuntu-Bold', fontSize: 20, alignSelf: 'center' },
    radioContainer: { flex: 8, alignItems: 'center' },
    radioText: { fontSize: 16, fontFamily: 'Ubuntu-Medium', color: colors.DARK, },
    radioContainerStyle: { paddingTop: 30, marginLeft: 10 },
    radioStyle: { paddingBottom: 25 },
    cancelModalButtosContainer: { flex: 1, flexDirection: 'row', backgroundColor: colors.BLACK, alignItems: 'center', justifyContent: 'center' },
    buttonSeparataor: { height: height / 35, width: 0.5, backgroundColor: colors.WHITE, alignItems: 'center', marginTop: 3 },
    cancelModalButttonStyle: { backgroundColor: colors.BLACK, borderRadius: 0 },
    cancelModalButtonContainerStyle: { flex: 1, width: (width * 2) / 2, backgroundColor: colors.GREY.iconSecondary, alignSelf: 'center', margin: 0 },
    signInTextStyle: {
        fontFamily: 'Ubuntu-Bold',
        fontWeight: "700",
        color: colors.WHITE
    },
    floatButton: {
        borderWidth: 1,
        borderColor: colors.GREEN.medium,
        alignItems: "center",
        justifyContent: "center",
        width: 55,
        position: "absolute",
        right: 10,
        height: 55,
        backgroundColor: colors.GREEN.medium,
        borderRadius: 30
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(22,22,22,0.8)"
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "flex-start",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    textContainerStyle: {
        flexDirection: 'column',
        alignItems: "flex-start",
        marginBottom: 12
    },
    textHeading: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    textContent: {
        fontSize: 14,
        margin: 4
    },
    modalButtonStyle: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.GREEN.light,
        width: 100,
        height: 40,
        elevation: 0,
        borderRadius: 10
    },
    modalButtonTextStyle: {
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 18
    },
});