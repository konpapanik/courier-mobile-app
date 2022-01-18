import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableWithoutFeedback,
    ImageBackground,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { Header, Rating, Avatar, Button } from 'react-native-elements';
import Dash from 'react-native-dash';
import { colors } from '../common/theme';
var { width } = Dimensions.get('window');
import { language } from 'config';
import { useSelector } from 'react-redux';
import { color } from 'react-native-reanimated';

export default function RideDetails(props) {

    const paramData = props.navigation.getParam('data');
    const settings = useSelector(state => state.settingsdata.settings);
    const auth = useSelector(state => state.auth);

    const goBack = () => {
        props.navigation.goBack();
    }

    const goToBooking = (id) => {
        if(paramData.status == 'PAYMENT_PENDING'){
            props.navigation.navigate('PaymentDetails', { booking: paramData });
        }else{
            props.navigation.replace('BookedDelivery',{bookingId:id});
        }
    };

    return (
        <View style={styles.mainView}>
            <Header
                backgroundColor={colors.WHITE}
                leftComponent={{ icon: 'ios-arrow-back', type: 'ionicon', color: colors.BLACK, size: 30, component: TouchableWithoutFeedback, onPress: () => { goBack() } }}
                centerComponent={<Text style={styles.headerTitleStyle}>{language.ride_details_page_title}</Text>}
                containerStyle={styles.headerStyle}
                innerContainerStyles={{ marginLeft: 10, marginRight: 10 }}
            />
            <ScrollView>
                <View style={styles.mapView}>
                    <View style={styles.mapcontainer}>
                        {paramData?
                        <MapView style={styles.map}
                            provider={PROVIDER_GOOGLE}
                            region={{
                                latitude: (paramData.pickup.lat),
                                longitude: (paramData.pickup.lng),
                                latitudeDelta: 0.0150,
                                longitudeDelta: 0.0150
                            }}
                        >
                                <Marker
                                    coordinate={{ latitude: paramData ? (paramData.pickup.lat) : 0.00, longitude: paramData ? (paramData.pickup.lng) : 0.00 }}
                                    title={language.pickup_marker_tooltip}
                                    description={paramData ? paramData.pickup.add : null}
                                    pinColor={colors.GREEN.default}
                                />
                                <Marker
                                    coordinate={{ latitude: (paramData.drop.lat), longitude: (paramData.drop.lng) }}
                                    title={language.delivery_marker_tooltip}
                                    description={paramData.drop.add}
                                />
                                <MapView.Polyline
                                    coordinates={paramData.coords}
                                    strokeWidth={3}
                                    strokeColor={colors.BLACK}
                                />
                        </MapView>
                        :null}
                    </View>
                </View>
                <View style={styles.rideDesc}>
                    <View style={styles.userDesc}>
                        {/* Driver Image */}
                        {paramData ?
                            paramData.driver_image != '' ?
                                <Avatar
                                    size="small"
                                    rounded
                                    source={{ uri: paramData.driver_image }}
                                    activeOpacity={0.7}
                                    
                                />
                                : paramData.driver_name != '' ?
                                    <Avatar
                                        size="small"
                                        rounded
                                        source={require('../../assets/images/profilePic.png')}
                                        activeOpacity={0.7}
                                        
                                    /> : null

                            : null}
                        <View style={styles.userView}>
                            {/*Driver Name */}
                            {paramData && paramData.driver_name != '' ? <Text style={styles.personStyle}>{paramData.driver_name}</Text> : null}
                            {paramData && paramData.rating > 0 ?

                                <View style={styles.personTextView}>
                                    
                                    <Text style={styles.ratingText}>{language.you_rated_text}</Text>
                                    <Rating
                                        type="star"
                                        fractions={3}
                                        startingValue={parseFloat(paramData.rating)}
                                        readonly
                                        imageSize={13}
                                        showRating={false}
                                        ratingColor="#000000"
                                    />
                                </View>
                                : null}
                        </View>
                    </View>
                    {/*Car details */}
                    {paramData && paramData.carType ?
                        <View style={[styles.userDesc, styles.avatarView]}>

                            <Avatar
                                size="small"
                                //rounded
                                source={paramData.carImage ? { uri: paramData.carImage } : require('../../assets/images/sample-package.png')}
                                activeOpacity={1}
                            />
                            <View style={styles.userView}>
                                <Text style={styles.carNoStyle}>{paramData.vehicle_number ? paramData.vehicle_number : <Text> {language.scooter_no_not_found}</Text>}</Text>
                                <Text style={styles.carNoStyleSubText}>{paramData.carType}</Text>
                            </View>
                        </View>
                        : null}
                        

                    {/* <View style={styles.userDesc}>
                        <Avatar
                            size="small"
                            source={Platform.OS == 'ios' ? require('../../assets/images/fareMetar.jpg') : require('../../assets/images/fareMetar.jpg')}
                            activeOpacity={0.7}

                        />
                        <View style={styles.userView}>
                            <Text style={styles.textStyle}>{settings.symbol}{paramData && paramData.customer_paid ? parseFloat(paramData.customer_paid).toFixed(2) : paramData && paramData.estimate ? paramData.estimate : 0}</Text>
                        </View>
                    </View> */}
                </View>
                <Dash style={styles.dashView} />
                <View>
                    <View style={styles.location}>
                        {paramData && paramData.trip_start_time ?
                            <View>
                                <Text style={styles.timeStyle}>{paramData.trip_start_time}</Text>
                            </View>
                            : null}
                        {paramData && paramData.pickup ?
                            <View style={styles.address}>
                                <View style={styles.greenDot} />
                                <Text style={styles.adressStyle}>{paramData.pickup.add}</Text>
                            </View>
                            : null}
                    </View>

                    <View style={styles.location}>
                        {paramData && paramData.trip_end_time ?
                            <View>
                                <Text style={styles.timeStyle}>{paramData.trip_end_time}</Text>
                            </View>
                            : null}
                        {paramData && paramData.drop ?
                            <View style={styles.address}>
                                <View style={styles.redDot} />
                                <Text style={styles.adressStyle}>{paramData.drop.add}</Text>
                            </View>
                            : null}
                    </View>
                </View>
                <Dash style={styles.dashView} />
                {paramData && ['PENDING','PAID','COMPLETE'].indexOf(paramData.status) != -1 ?
                    <View style={styles.billView}>
                        <View style={styles.billView}>
                            <Text style={styles.billTitle}>{language.bill_details_title}</Text>
                        </View>
                        <View style={styles.billOptions}>
                            <View style={styles.billItem}>
                                <Text style={styles.billName}>{language.your_trip}</Text>
                                <Text style={styles.billAmount}>{settings.symbol} {paramData && paramData.trip_cost > 0 ? parseFloat(paramData.trip_cost).toFixed(2) : paramData && paramData.estimate ? parseFloat(paramData.estimate).toFixed(2) : 0}</Text>
                            </View>
                            <View style={styles.billItem}>
                                <View>
                                    <Text style={[styles.billName, styles.billText]}>{language.discount}</Text>
                                    <Text style={styles.taxColor}>{language.promo_apply}</Text>
                                </View>
                                <Text style={styles.discountAmount}> - {settings.symbol}{paramData && paramData.discount_amount ? parseFloat(paramData.discount_amount).toFixed(2) : 0}</Text>

                            </View>

                            {paramData && paramData.cardPaymentAmount ? paramData.cardPaymentAmount > 0 ?
                                <View style={styles.billItem}>
                                    <View>
                                        <Text >{language.CardPaymentAmount}</Text>

                                    </View>
                                    <Text >  {settings.symbol}{paramData && paramData.cardPaymentAmount ? parseFloat(paramData.cardPaymentAmount).toFixed(2) : 0}</Text>

                                </View>
                                : null : null}
                            {paramData && paramData.cashPaymentAmount ? paramData.cashPaymentAmount > 0 ?
                                <View style={styles.billItem}>
                                    <View>
                                        <Text >{language.CashPaymentAmount}</Text>

                                    </View>
                                    <Text>  {settings.symbol}{paramData && paramData.cashPaymentAmount ? parseFloat(paramData.cashPaymentAmount).toFixed(2) : 0}</Text>

                                </View>
                                : null : null}
                            {paramData && paramData.usedWalletMoney ? paramData.usedWalletMoney > 0 ?
                                <View style={styles.billItem}>
                                    <View>
                                        <Text>{language.WalletPayment}</Text>

                                    </View>
                                    <Text >  {settings.symbol}{paramData && paramData.usedWalletMoney ? parseFloat(paramData.usedWalletMoney).toFixed(2) : 0}</Text>

                                </View>
                                : null : null}
                        </View>
                        <View style={styles.paybleAmtView}>
                            <Text style={styles.billTitle}>{language.Customer_paid}</Text>
                            <Text style={styles.billAmount2}>{settings.symbol}{paramData && paramData.customer_paid ? parseFloat(paramData.customer_paid).toFixed(2) : null}</Text>
                        </View>
                    </View>
                    : null}
                {paramData &&  ['PENDING','PAID','COMPLETE'].indexOf(paramData.status) != -1 ?
                    <View>
                        <View style={styles.iosView}>
                            {
                                Platform.OS == 'ios' ?
                                    <ImageBackground source={require('../../assets/images/dash.png')}
                                        style={styles.backgroundImage}
                                        resizeMode={Platform.OS == 'ios' ? 'repeat' : 'stretch'}>
                                    </ImageBackground>
                                    :
                                    <Dash style={styles.dashView} />
                            }
                        </View>

                        <View style={styles.paymentTextView}>
                            <Text style={styles.billTitle}>{language.payment_status}</Text>
                        </View>
                        {paramData && paramData.status ?
                            <View style={styles.billOptions}>
                                <View style={styles.billItem}>
                                    <Text style={styles.billName}>{language.payment_status}</Text>
                                    <Text style={styles.billAmount}>{language[paramData.status]}</Text>

                                </View>
                                {['PAID','COMPLETE'].indexOf(paramData.status) != -1 ?
                                <View style={styles.billItem}>
                                    <Text style={styles.billName}>{language.pay_mode}</Text>
                                    <Text style={styles.billAmount}>{paramData.payment_mode ? paramData.payment_mode : null} {paramData.gateway ? '(' + paramData.gateway + ')' : null}</Text>
                                </View>
                                :null}
                            </View>
                            : <View style={styles.billOptions}>
                                <View style={styles.billItem}></View>
                            </View>}
                    </View>
                :null}
                {(paramData && paramData.status &&  auth && auth.info && auth.info.profile && 
                    (((['PAYMENT_PENDING','NEW','ACCEPTED','ARRIVED','STARTED','REACHED','PENDING','PAID'].indexOf(paramData.status) != -1) && auth.info.profile.usertype=='dispatcher') ||
                    ((['ACCEPTED','ARRIVED','STARTED','REACHED'].indexOf(paramData.status) != -1) && auth.info.profile.usertype=='driver')))?
                    <View>
                        <Button
                            title={language.go_to_booking}
                            loading={false}
                            loadingProps={{ size: "large", color: colors.BLACK }}
                            titleStyle={styles.buttonTitleText2}
                            onPress={() => { goToBooking(paramData.id) }}
                            //containerStyle={styles.paynowButton}
                        />
                    </View> : null}
            </ScrollView>
        </View>
    )

}

const styles = StyleSheet.create({
    headerStyle: {
        backgroundColor: colors.GREY.default,
        borderBottomWidth: 0
    },
    headerTitleStyle: {
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        fontSize: 20
    },
    containerView: {
        flex: 1
    },
    textContainer: {
        textAlign: "center"
    },
    mapView: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 180,
        marginBottom: 15
    },
    mapcontainer: {
        flex: 7,
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    // triangle: {
    //     width: 0,
    //     height: 0,
    //     backgroundColor: colors.TRANSPARENT,
    //     borderStyle: 'solid',
    //     borderLeftWidth: 9,
    //     borderRightWidth: 9,
    //     borderBottomWidth: 10,
    //     borderLeftColor: colors.TRANSPARENT,
    //     borderRightColor: colors.TRANSPARENT,
    //     borderBottomColor: colors.GREEN.medium,
    //     transform: [
    //         { rotate: '180deg' }
    //     ]
    // },
    rideDesc: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        paddingLeft: 12, // if you want to fill rows left to right
        marginBottom: 20
      },
      userDesc: {
        width: '50%', // is 50% of container width
        paddingLeft: 32,
      },
    
    userView: {
        flexDirection: 'column',
    },
    locationView: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 10,
        padding: 10,
        marginVertical: 14,
        justifyContent: "space-between",
    },
    locationView2: {
        flex: 1,
        flexDirection: 'row',
        // paddingHorizontal: 10,
        padding: 10,
        marginVertical: 14,

    },
    // callButtonStyle:{
    // width:400
    // },
    location: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 5,
    },

    greenDot: {
        backgroundColor: colors.GREEN.default,
        width: 14,
        height: 14,
        //borderRadius: 50,
        alignSelf: 'flex-start',
        marginTop: 4
    },
    redDot: {
        backgroundColor: colors.BLACK,
        width: 14,
        height: 14,
        //borderRadius: 0,
        alignSelf: 'flex-start',
        marginTop: 4
    },
    address: {
        flexDirection: 'row',
        flexGrow: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        width: 0,
        marginLeft: 7
    },
    billView: {
        marginVertical: 4
    },
    billTitle: {
        fontSize: 18,
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Bold',
        marginTop:24,
    },
    billOptions: {
        marginHorizontal: 13,
        marginVertical: 5
    },
    billItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginVertical: 8
    },
    billName: {
        fontSize: 16,
        fontFamily: 'Ubuntu-Regular',
        color: colors.BLACK
    },
    billAmount: {
        fontSize: 16,
        fontFamily: 'Ubuntu-Medium',
        color: colors.BLACK
    },
    discountAmount: {
        fontSize: 16,
        fontFamily: 'Ubuntu-Medium',
        color: colors.RED
    },

    billAmount2: {
        fontWeight: 'bold',
        fontSize: 18,
        fontFamily: 'Ubuntu-Bold',
        color: colors.BLACK
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: 2,
    },
    carNoStyle: {
        fontSize: 16,
        //fontWeight: 'bold', 
        fontFamily: 'Ubuntu-Medium',
    },
    carNoStyleSubText: {
        fontSize: 16,
        //fontWeight: 'bold', 
        fontFamily: 'Ubuntu-Regular',
        color: colors.BLACK
    },
    textStyle: {
        fontSize: 18,
        //fontWeight: 'bold', 
        fontFamily: 'Ubuntu-Medium'
    },
    mainView: {
        flex: 1,
        backgroundColor: "#ffffff",
        //marginTop: StatusBar.currentHeight 
    },
    personStyle: {
        fontSize: 16,
        //fontWeight: 'bold', 
        color: colors.BLACK,
        fontFamily: 'Ubuntu-Medium'
    },
    personTextView: {
        flexDirection: 'row',
        alignItems: 'center'
        
    },
    ratingText: {
        fontSize: 16,
        color: colors.GREY.iconSecondary,
        marginRight: 8,
        fontFamily: 'Ubuntu-Regular'
        
    },
    avatarView: {
        marginVertical: 0
    },
    timeStyle: {
        fontFamily: 'Ubuntu-Regular',
        fontSize: 18,
        fontWeight:'bold',
        marginTop: 2,
        marginLeft:16,
    },
    adressStyle: {
        marginLeft: 6,
        marginTop: 2,
        fontSize: 15,
        lineHeight: 20
    },
    billView: {
        paddingHorizontal: 14
    },
    billText: {
        fontFamily: 'Ubuntu-Bold'
    },
    taxColor: {
        color: colors.BLACK
    },
    paybleAmtView: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10
    },
    iosView: {
        paddingVertical: 10
    },
    dashView: {
        width: width, height: 1
    },
    paymentTextView: {
        paddingHorizontal: 10
    },
    // callButtonStyle:{
    //     width:50+'%'
    // },
    callButtonContainerStyle1: {
        flex: 1,
        width: '80%',
        height: 100
    },
    callButtonContainerStyle2: {
        flex: 1,
        width: '80%',
        height: 100,
        paddingLeft: 10
    },
    paynowButton: {
        flex: 1,
        width: '80%',
        height: 130,
        paddingLeft: 10
    },
});