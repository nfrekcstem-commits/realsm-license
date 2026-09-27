-- REALS'M HUB V6 - LICENSE CLIENT EXAMPLE
-- Put your HTTPS API domain in API_BASE.
-- This only verifies licenses/permissions; it does not automate game actions.
local HttpService=game:GetService('HttpService')
local Players=game:GetService('Players')
local Player=Players.LocalPlayer
local API_BASE='https://YOUR-DOMAIN.example'
local function VerifyLicense(key)
 local ok,res=pcall(function() return HttpService:RequestAsync({Url=API_BASE..'/api/license/verify',Method='POST',Headers={['Content-Type']='application/json'},Body=HttpService:JSONEncode({key=key,clientId=tostring(Player.UserId)})}) end)
 if not ok or not res.Success then return false,{status='SERVER_ERROR'} end
 local data=HttpService:JSONDecode(res.Body)
 return data.ok==true,data
end
-- local valid,info=VerifyLicense(InputBox.Text)
