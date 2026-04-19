import axios from 'axios';
import React, { useContext, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext';
import './Verify.css'

const Verify = () => {
  const { url } = useContext(StoreContext)
  const [searchParams, setSearchParams] = useSearchParams();
  const success = searchParams.get("success")
  const orderId = searchParams.get("orderId")

  const navigate = useNavigate();

  const verifyPayment = async () => {
    const response = await axios.post(url + "/api/order/verify", { success, orderId });
    if (response.data.success) {
      // Check if this was a shared delivery order
      try {
        const trackRes = await axios.get(`${url}/api/order/track/${orderId}`, { headers: { token: localStorage.getItem("token") } });
        if (trackRes.data.success) {
           const order = trackRes.data.data;
           if (order.deliveryPreference === 'shared' && !order.isSharedDelivery) {
              navigate(`/order/shared-waiting/${orderId}`);
              return;
           }
        }
      } catch (e) {
        console.error("Verify redirect check failed:", e);
      }
      navigate("/myorders");
    }
    else {
      navigate("/")
    }
  }

  useEffect(() => {
    verifyPayment();
  }, [])

  return (
    <div className='verify'>
      <div className="spinner"></div>
    </div>
  )
}

export default Verify
