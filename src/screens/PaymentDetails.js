import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Modal,
  Alert
} from 'react-native';
import { Header, CheckBox } from 'react-native-elements';
import { colors } from '../common/theme';
var { width, height } = Dimensions.get('window');
import { PromoComp } from "../components";
import { language } from 'config';
import { useSelector,useDispatch } from 'react-redux';
import { FirebaseContext } from 'common/src';

export default function PaymentDetails(props) {
  const { api } = useContext(FirebaseContext);
  const {
    updateBooking,
    updateWalletBalance,
    cancelBooking,
    editPromo
  } = api;
  const dispatch = useDispatch();
  const userdata = useSelector(state => state.auth.info.profile);
  const uid = useSelector(state => state.auth.info.uid);
  const settings = useSelector(state => state.settingsdata.settings);
  const providers = useSelector(state => state.paymentmethods.providers);
  const walletBalance = useSelector(state => state.auth.info.profile.walletBalance);
  const booking = props.navigation.getParam('booking');

  const [promodalVisible, setPromodalVisible] = useState(false);
  const [useWalletCash, setUseWalletCash] = useState(false);

  const [payDetails, setPayDetails] = useState({
    amount: booking.trip_cost,
    discount: booking.discount? booking.discount:0,
    usedWalletMoney: booking.usedWalletMoney?booking.usedWalletMoney:0,
    promo_applied: booking.promo_applied?booking.promo_applied:false,
    promo_details: booking.promo_details?booking.promo_details:null,
    payableAmmount: booking.payableAmmount?booking.payableAmmount:booking.trip_cost
  });

  const useWallet = () => {
    let res = !useWalletCash;
    setUseWalletCash(res);
    if (res) {
      if (parseFloat(walletBalance) >= parseFloat(payDetails.payableAmmount)) {
        let data = { ...payDetails };
        data.usedWalletMoney = parseFloat(data.payableAmmount).toFixed(2);
        data.payableAmmount = 0;
        setPayDetails(data);
      } else {
        let data = { ...payDetails };
        data.usedWalletMoney = parseFloat(walletBalance);
        data.payableAmmount = (parseFloat(data.payableAmmount) - parseFloat(walletBalance)).toFixed(2);
        setPayDetails(data);
      }
    } else {
      let data = { ...payDetails };
      data.payableAmmount = parseFloat((parseFloat(data.payableAmmount) + parseFloat(data.usedWalletMoney)).toFixed(2));
      data.usedWalletMoney = 0;
      setPayDetails(data);
    }
  }

  const promoModal = () => {
    return (
      <Modal
        animationType="none"
        visible={promodalVisible}
        onRequestClose={() => {
          setPromodalVisible(false);
        }}>
        <Header
          backgroundColor={colors.GREY.default}
          rightComponent={{ icon: 'ios-close', type: 'ionicon', color: colors.BLACK, size: 38, component: TouchableWithoutFeedback, onPress: () => { setPromodalVisible(false) } }}
          centerComponent={<Text style={styles.headerTitleStyle}>{language.your_promo}</Text>}
          containerStyle={styles.headerStyle}
          innerContainerStyles={{ marginLeft: 10, marginRight: 10 }}
        />
        <PromoComp onPressButton={(item, index) => { selectCoupon(item, index) }}></PromoComp>
      </Modal>
    )
  }

  const openPromoModal = () => {
    setPromodalVisible(!promodalVisible);
    let data = { ...payDetails };
    data.payableAmmount = data.amount;
    data.discount = 0;
    data.promo_applied = false;
    data.promo_details = null;
    data.usedWalletMoney = 0;
    setPayDetails(data);
    setUseWalletCash(false);
  }

  const removePromo = () => {
    let data = { ...payDetails };
    data.promo_details.user_avail = parseInt(data.promo_details.user_avail) - 1;
    delete data.promo_details.usersUsed[uid];
    dispatch(editPromo(data.promo_details));
    data.payableAmmount = data.amount;
    data.discount = 0;
    data.promo_applied = false;
    data.promo_details = null;
    data.usedWalletMoney = 0;
    setPayDetails(data);
    setUseWalletCash(false);
  }

  const doPayment = (payment_mode) => {

    if (payment_mode == 'cash' || payment_mode == 'wallet') {
        let curBooking = { ...booking };
        if(booking.status == "PAYMENT_PENDING"){
          curBooking.status = 'NEW';
        } else {
          curBooking.status = 'PAID';
        }
        curBooking.payment_mode = payment_mode;
        curBooking.customer_paid = curBooking.status == 'NEW'? parseFloat(payDetails.usedWalletMoney).toFixed(2):((parseFloat(payDetails.amount) - parseFloat(payDetails.discount)).toFixed(2));
        curBooking.discount_amount = parseFloat(payDetails.discount).toFixed(2);
        curBooking.usedWalletMoney = parseFloat(payDetails.usedWalletMoney).toFixed(2);
        curBooking.cardPaymentAmount = 0;
        curBooking.cashPaymentAmount = parseFloat(payDetails.payableAmmount).toFixed(2);
        curBooking.payableAmmount = parseFloat(payDetails.payableAmmount).toFixed(2);
        curBooking.promo_applied = payDetails.promo_applied;
        curBooking.promo_details = payDetails.promo_details;
        dispatch(updateBooking(curBooking));

        if(payDetails.usedWalletMoney>0 && booking.status == "PAYMENT_PENDING"){
          let walletBalance = parseFloat(userdata.walletBalance) - parseFloat(payDetails.usedWalletMoney);
          let tDate = new Date();
          let details = {
            type: 'Debit',
            amount: payDetails.usedWalletMoney,
            date: tDate.toString(),
            txRef: booking.id
          }
          dispatch(updateWalletBalance(walletBalance,details));
        }
        if(userdata.usertype == 'dispatcher') {
          if(curBooking.status == 'NEW'){
            props.navigation.navigate('BookedDelivery',{bookingId:booking.id});
          }else{
            props.navigation.navigate('DriverRating',{booking:booking});
          }
        }else{
          props.navigation.navigate('DriverTrips');
        }
    }else{
      let curBooking = { ...booking };
      if(userdata.usertype == 'dispatcher') {
  
        let payData = {
          email: userdata.email,
          amount: payDetails.payableAmmount,
          order_id: booking.id,
          name: language.bookingPayment,
          description: language.order_id + booking.id,
          currency: settings.code,
          quantity: 1
        }

        curBooking.payment_mode = payment_mode;
        curBooking.customer_paid = (parseFloat(payDetails.amount) - parseFloat(payDetails.discount)).toFixed(2);
        curBooking.discount_amount = parseFloat(payDetails.discount).toFixed(2);
        curBooking.usedWalletMoney = parseFloat(payDetails.usedWalletMoney).toFixed(2);
        curBooking.cardPaymentAmount = parseFloat(payDetails.payableAmmount).toFixed(2);
        curBooking.cashPaymentAmount = 0;
        curBooking.payableAmmount = parseFloat(payDetails.payableAmmount).toFixed(2);
        curBooking.promo_applied = payDetails.promo_applied;
        curBooking.promo_details = payDetails.promo_details;
        dispatch(updateBooking(curBooking));

        props.navigation.navigate("paymentMethod", {
          payData: payData,
          userdata: userdata,
          settings: settings,
          providers: providers,
          booking: curBooking
        });
      }else{
        if(booking.status != "PAYMENT_PENDING"){
          curBooking.status = 'PENDING';
        }
        dispatch(updateBooking(curBooking));
        props.navigation.navigate('DriverTrips');
      }
    
    }
  }

  const selectCoupon = (item, index) => {
    var toDay = new Date();
    var expDate = new Date(item.promo_validity)
    expDate.setDate(expDate.getDate() + 1);
    item.usersUsed = item.usersUsed? item.usersUsed :{};
    if (payDetails.amount < item.min_order) {
      Alert.alert(language.alert,language.promo_eligiblity)
    } else if (item.user_avail && item.user_avail >= item.promo_usage_limit) {
      Alert.alert(language.alert,language.promo_exp_limit)
    } else if (item.usersUsed[uid]) {
      Alert.alert(language.alert,language.promo_used)
    } else if (toDay > expDate) {
      Alert.alert(language.alert,language.promo_exp)
    } else {
      let discounttype = item.promo_discount_type.toUpperCase();
      if (discounttype == 'PERCENTAGE') {
        let discount = parseFloat(payDetails.amount * item.promo_discount_value / 100).toFixed(2);
        if (discount > item.max_promo_discount_value) {
          let discount = item.max_promo_discount_value;
          let data = { ...payDetails };
          data.discount = discount
          data.promo_applied = true
          item.user_avail = item.user_avail? parseInt(item.user_avail) + 1 : 1;
          item.usersUsed[uid]=true;
          dispatch(editPromo(item));
          data.promo_details = item
          data.payableAmmount = parseFloat(data.payableAmmount - discount).toFixed(2);
          setPayDetails(data);
          setPromodalVisible(false);
        } else {
          let data = { ...payDetails };
          data.discount = discount
          data.promo_applied = true
          item.user_avail = item.user_avail? parseInt(item.user_avail) + 1 : 1;
          item.usersUsed[uid]=true;
          dispatch(editPromo(item));
          data.promo_details = item,
          data.payableAmmount = parseFloat(data.payableAmmount - discount).toFixed(2);
          setPayDetails(data);
          setPromodalVisible(false);
        }
      } else {
        let discount = item.max_promo_discount_value;
        let data = { ...payDetails };
        data.discount = discount
        data.promo_applied = true
        item.user_avail = item.user_avail? parseInt(item.user_avail) + 1 : 1;
        item.usersUsed[uid]=true;
        dispatch(editPromo(item));
        data.promo_details = item,
        data.payableAmmount = parseFloat(data.payableAmmount - discount).toFixed(2);
        setPayDetails(data);
        setPromodalVisible(false);
      }
    }

  }

  const cancelCurBooking = () => {
    Alert.alert(
      language.alert,
      language.cancel_confirm,
      [
          { text: language.cancel, onPress: () => console.log('NO Pressed'), style: 'cancel' },
          { text: language.ok, onPress: () => {
              payDetails.promo_applied? removePromo(): null;
              dispatch(
                cancelBooking(
                  { 
                    booking: booking, 
                    reason: language.cancelled_incomplete_booking 
                  }
                )
              );
              props.navigation.navigate('Map');
            }
          },
      ]
    );
  };

  return (
    <View style={styles.mainView}>
      <Header
        backgroundColor={colors.GREY.default}
        leftComponent={{ icon: 'body-outline', type: 'ionicon', color: colors.BLACK, size: 34, component: TouchableWithoutFeedback, onPress: () => { props.navigation.toggleDrawer(); } }}
        centerComponent={<Text style={styles.headerTitleStyle}>{language.payment}</Text>}
        rightComponent={ userdata && userdata.usertype == 'dispatcher' && booking.status =='PAYMENT_PENDING'?<TouchableOpacity onPress={cancelCurBooking}><Text style={{color:colors.BLACK}}>{language.cancel}</Text></TouchableOpacity>:null}
        containerStyle={styles.headerStyle}
        innerContainerStyles={{ marginLeft: 10, marginRight: 10 }}
      />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollStyle}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 20, marginBottom: 4 }}>
            <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 22, fontWeight: '500' }}>{language.bill_details}</Text>
            {userdata && userdata.usertype == 'dispatcher' && booking.status == 'PAYMENT_PENDING'? 
                payDetails.promo_applied ?
                <TouchableOpacity
                  onPress={() => { removePromo() }}>
                  <Text style={{ color: 'red', textAlign: 'left', lineHeight: 45, fontSize: 14, fontWeight: '500' }}>{language.remove_promo}</Text>
                </TouchableOpacity>
                :
                <TouchableOpacity
                  onPress={() => { openPromoModal() }}>
                  <Text style={{ color: colors.GREEN.bright, textAlign: 'left', lineHeight: 45, fontSize: 14, fontWeight: '700' }}>{language.apply_promo}</Text>
                </TouchableOpacity>
              : null}
          </View>
          {userdata && userdata.usertype == 'driver' ?
            <View style={{ flex: 1, paddingLeft: 25, paddingRight: 25 }}>
              <View style={styles.location}>
                {booking && booking.trip_start_time ?
                  <View>
                    <Text style={styles.timeStyle}>{booking.trip_start_time}</Text>
                  </View>
                  : null}
                {booking && booking.pickup ?
                  <View style={styles.address}>
                    <View style={styles.greenDot} />
                    <Text style={styles.adressStyle}>{booking.pickup.add}</Text>
                  </View>
                  : null}
              </View>

              <View style={styles.location}>
                {booking && booking.trip_end_time ?
                  <View>
                    <Text style={styles.timeStyle}>{booking.trip_end_time}</Text>
                  </View>
                  : null}
                {booking && booking.drop ?
                  <View style={styles.address}>
                    <View style={styles.redDot} />
                    <Text style={styles.adressStyle}>{booking.drop.add}</Text>
                  </View>
                  : null}
              </View>
            </View>
            : null}

          {userdata && userdata.usertype == 'driver' ?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{language.distance}</Text>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>
                {
                  (booking && booking.estimateDistance ? booking.estimateDistance :  '0') + ' ' + (settings && settings.convert_to_mile? language.mile : language.km)
                }
              </Text>
            </View>
            : null}
          {userdata && userdata.usertype == 'driver' ?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{language.total_time}</Text>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{(booking && booking.total_trip_time ? parseFloat(booking.total_trip_time / 60).toFixed(1)  : '0') + ' ' + language.mins}</Text>
            </View>
            : null}
          {userdata && userdata.usertype == 'driver' ?
            <View style={{
              borderStyle: 'dotted',
              borderWidth: 0.5,
              borderRadius: 1,
              marginBottom: 20
            }}>
            </View>
            : null}


          {userdata ?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{userdata.usertype == 'dispatcher' ? language.your_fare: language.total_fare}</Text>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{settings.symbol} {parseFloat(payDetails.amount).toFixed(2)}</Text>
            </View>
            : null
          }
          {userdata ?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{language.promo_discount}</Text>
              <Text style={{ color: colors.DULL_RED, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>- {settings.symbol} {payDetails ? payDetails.discount ? parseFloat(payDetails.discount).toFixed(2) : '0.00' : '0.00'}</Text>
            </View>
            : null}
          {useWalletCash || (booking.status != 'PAYMENT_PENDING' && booking.usedWalletMoney)?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.BLACK, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>{language.WalletPayment}</Text>
              <Text style={{ color: colors.DULL_RED, textAlign: 'left', lineHeight: 45, fontSize: 16 }}>- {settings.symbol} {payDetails ? payDetails.usedWalletMoney ? parseFloat(payDetails.usedWalletMoney).toFixed(2) : '0.00' : '0.00'}</Text>
            </View> : null}

          {userdata && userdata.usertype == 'dispatcher'  && booking.status == 'PAYMENT_PENDING'? 
            <View style={{ flex: 1 }}>
              <CheckBox
                center
                checkedColor='green'
                disabled={parseFloat(walletBalance) > 0 ? false : true}
                title={language.use_wallet_balance + settings.symbol + (parseFloat(walletBalance) - parseFloat(payDetails.usedWalletMoney)).toFixed(2) + ')'}
                checked={useWalletCash}
                containerStyle={{ backgroundColor: colors.GREY.default, borderWidth: 1, borderColor: colors.GREEN.light,marginBottom: 30, alignSelf: 'flex-start' }}
                onPress={() => { useWallet() }}>
              </CheckBox>

            </View>
            : null}
          {userdata ?
            <View style={{
              borderStyle: 'dotted',
              borderWidth: 0.5,
              borderRadius: 1,  
            }}>
            </View>
            : null}
          {userdata ?
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 25, paddingRight: 25 }}>
              <Text style={{ color: colors.GREEN.bright, textAlign: 'left', lineHeight: 45, fontSize: 22, fontWeight: '500' }}>{language.payable_ammount}</Text>
              <Text style={{ color: colors.GREEN.bright, textAlign: 'left', lineHeight: 45, fontSize: 22, fontWeight: 'bold' }}>{settings.symbol} {payDetails.payableAmmount ? parseFloat(payDetails.payableAmmount).toFixed(2) : 0.00}</Text>
            </View>
            : null}
        </View>
        {payDetails.payableAmmount == 0 ?
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonWrapper2}
              onPress={() => {
                doPayment('wallet');
              }}>
              <Text style={styles.buttonTitle}>{userdata && userdata.usertype == 'dispatcher'?language.paynow_button: language.ok}</Text>
            </TouchableOpacity>
          </View>
          :
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={() => {
                doPayment('cash');
              }}>
              <Text style={styles.buttonTitle}>{booking.status=='PAYMENT_PENDING'?language.cash_on_delivery:language.pay_cash}</Text>
            </TouchableOpacity>
            {providers?
              <TouchableOpacity
                style={styles.cardPayBtn}
                onPress={() => {
                  doPayment('card');
                }}>
                <Text style={styles.buttonTitle}>{userdata && userdata.usertype == 'dispatcher' ? language.payWithCard : language.request_payment}</Text>
              </TouchableOpacity>
            : null}
          </View>
        }

      </ScrollView>
      {
        promoModal()
      }
    </View>
  );

}

const styles = StyleSheet.create({

  mainView: {
    flex: 1,
    backgroundColor: colors.WHITE,
    //marginTop: StatusBar.currentHeight 
  },
  headerStyle: {
    backgroundColor: colors.GREY.default,
    borderBottomWidth: 0
  },
  headerTitleStyle: {
    color: colors.BLACK,
    fontFamily: 'Ubuntu-Bold',
    fontSize: 16
},
  scrollStyle: {
    flex: 1,
    height: height,
    backgroundColor: colors.WHITE
  },
  container: {
    flex: 1,
    marginTop: 5,
    backgroundColor: 'white',
  },
  buttonContainer: {
    width: '100%',
    //position: 'absolute',
    //bottom: 10
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:20
  },

  buttonWrapper: {
    marginHorizontal: 6,
    //marginBottom: 15,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.GREY.Deep_Nobel,
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 15

  },
  cardPayBtn: {
    marginHorizontal: 6,
    //marginBottom: 15,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.GREEN.light,
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 15

  },
  buttonWrapper2: {
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 10,
    marginTop: 20,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.GREEN.light,
    borderRadius: 8,
    width: '90%'
  },
  buttonTitle: {
    color: colors.BLACK,
    fontSize: 16,
  },
  newname: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailInputContainer: {
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingLeft: 10,
    backgroundColor: colors.WHITE,
    paddingRight: 10,
    paddingTop: 10,
    width: width - 80
  },
  errorMessageStyle: {
    fontSize: 15,
    fontWeight: 'bold'
  },
  inputTextStyle: {
    color: colors.BLACK,
    fontSize: 16
  },
  pinbuttonStyle: { elevation: 0, bottom: 15, width: '80%', alignSelf: "center", borderRadius: 20, borderColor: "transparent", backgroundColor: colors.GREY.btnPrimary, },
  pinbuttonContainer: { flex: 1, justifyContent: 'center' },
  inputContainer: { flex: 3, justifyContent: "center", marginTop: 40 },
  pinheaderContainer: { height: 250, backgroundColor: colors.WHITE, width: '80%', justifyContent: 'space-evenly' },
  pinheaderStyle: { flex: 1, flexDirection: 'column', backgroundColor: colors.GREY.default, justifyContent: "center" },
  forgotPassText: { textAlign: "center", color: colors.WHITE, fontSize: 20, width: "100%" },
  pinContainer: { flexDirection: "row", justifyContent: "space-between" },
  forgotStyle: { flex: 3, justifyContent: "center", alignItems: 'center' },
  crossIconContainer: { flex: 1, left: '40%' },
  forgot: { flex: 1 },
  pinbuttonTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    width: '100%',
    textAlign: 'center'
  },
  newname2: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  emailInputContainer2: {
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingLeft: 10,
    backgroundColor: colors.WHITE,
    paddingRight: 10,
    paddingTop: 10,
    width: width - 80,

  },

  inputTextStyle2: {
    color: colors.BLACK,
    fontSize: 14
  },
  buttonStyle2: { elevation: 0, bottom: 15, width: '80%', alignSelf: "center", borderRadius: 20, borderColor: "transparent", backgroundColor: colors.GREY.btnPrimary, },
  buttonContainer2: { flex: 1, justifyContent: 'center', marginTop: 5 },
  inputContainer2: { flex: 4, paddingBottom: 25 },
  headerContainer2: { height: 380, backgroundColor: colors.WHITE, width: '80%', justifyContent: 'center' },
  headerStyle2: { flex: 1, flexDirection: 'column', backgroundColor: colors.GREY.default, justifyContent: "center" },
  forgotPassText2: { textAlign: "center", color: colors.WHITE, fontSize: 16, width: "100%" },
  forgotContainer2: { flexDirection: "row", justifyContent: "space-between" },
  forgotStyle2: { flex: 3, justifyContent: "center" },
  crossIconContainer2: { flex: 1, left: '40%' },
  forgot2: { flex: 1 },
  buttonTitle2: {
    fontWeight: 'bold',
    fontSize: 16,
    width: '100%',
    textAlign: 'center'
  },

  containercvv: {
    flex: 1,
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingTop: 120
  },
  modalContainercvv: {
    height: 200,
    backgroundColor: colors.GREY.default,
    width: "80%",
    borderRadius: 10,
    elevation: 15
  },
  crossIconContainercvv: {
    flex: 1,
    left: "40%"
  },
  blankViewStylecvv: {
    flex: 1,
    flexDirection: "row",
    alignSelf: 'flex-end',
    marginTop: 15,
    marginRight: 15
  },
  blankViewStyleOTP: {
    flex: 1,
    flexDirection: "row",
    alignSelf: 'flex-end',

  },
  modalHeaderStylecvv: {
    textAlign: "center",
    fontSize: 20,
    paddingTop: 10
  },
  modalContainerViewStylecvv: {
    flex: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  itemsViewStylecvv: {
    flexDirection: "column",
    // justifyContent: "space-between"
  },
  textStylecvv: {
    fontSize: 20
  },
  inputcvv: {
    fontSize: 20,
    marginBottom: 20,
    borderColor: colors.GREY.Smoke_Grey,
    borderWidth: 1,
    borderRadius: 8,
    width: "80%",
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 10,
    paddingLeft: 10,
    textAlign: 'center'
  },
  location: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6
  },
  timeStyle: {
    fontFamily: 'Ubuntu-Regular',
    fontSize: 16,
    marginTop: 1
  },
  greenDot: {
    backgroundColor: colors.GREEN.default,
    width: 12,
    height: 12,
    //borderRadius: 50,
    alignSelf: 'flex-start',
    marginTop: 5
  },
  redDot: {
    backgroundColor: colors.BLACK,
    width: 14,
    height: 14,
    //borderRadius: 50,
    alignSelf: 'flex-start',
    marginTop: 5
  },
  address: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: 0,
    marginLeft: 6
  },
  adressStyle: {
    marginLeft: 6,
    fontSize: 15,
    lineHeight: 20
  },
});