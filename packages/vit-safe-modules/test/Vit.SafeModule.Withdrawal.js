const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vit.SafeModule.Withdrawal", function () {
    // contracts
    let VitSafeModuleWithdrawal, withdrawalInstance, MockSafe, mockSafe, mockSafeSigner, xCHF;

    // Te address of the contract Boss
    let owner;
    // The address of main wallet
    let user; 
    // The address of the recipient to whom the funds will be sent.
    let recipient;

    beforeEach(async function () {
        // Déploiement des contrats nécessaires
        MockSafe = await ethers.getContractFactory("MockSafe");
        mockSafe = await MockSafe.deploy();

        const ERC20Mock = await ethers.getContractFactory("MockERC20");
        xCHF = await ERC20Mock.deploy("xCHF Token", "xCHF", ethers.parseEther("1000"));

        await mockSafe.waitForDeployment();
        await xCHF.waitForDeployment();
    
        // owner is the deployer of the contract
        [owner, user, recipient] = await ethers.getSigners();

        
        //
        // impersonate mockSafe, means we can send tx as mockSafe (==msg.sender)
        const mockSafeAddress = await mockSafe.getAddress();
        await ethers.provider.send("hardhat_impersonateAccount", [mockSafeAddress]);
        mockSafeSigner = await ethers.getSigner(await mockSafe.getAddress());

        VitSafeModuleWithdrawal = await ethers.getContractFactory("VitSafeModuleWithdrawal");
        withdrawalInstance = await VitSafeModuleWithdrawal.deploy(xCHF.address,await owner.getAddress());
        await withdrawalInstance.waitForDeployment();

        //
        // contract have static address, signer dynamic
        //await withdrawalInstance.initialize(await xCHF.getAddress(),await owner.getAddress());        


        // Distribute xCHF to user
        // console.log("xCHF address",user.address);
        const userAmount = ethers.parseEther("500");
        await xCHF.transfer(user.address, userAmount);
        const userBalance = await xCHF.balanceOf(user.address);
        expect(userBalance).to.equal(userAmount);
         

        // Distribute ETH to user and recipient
        await owner.sendTransaction({
          to: mockSafeSigner.address, // Adresse du compte sans fonds
          value: ethers.parseEther("1.0"), // 1 ETH
        });
        //await ethers.provider.send("hardhat_stopImpersonatingAccount", [mockSafeAddress]);

    });

    it("should create a withdrawal request", async function () {
        const secretHash =  ethers.keccak256(ethers.toUtf8Bytes("secret"));
        const amount = ethers.parseEther("100");

        const tx = await withdrawalInstance.connect(mockSafeSigner).createWithdrawal(secretHash, amount);
        await tx.wait();
        //console.log("request", receipt);
    
        // await expect(withdrawalInstance.connect(mockSafeSigner).createWithdrawal(secretHash, amount))
        //     .to.emit(withdrawalInstance, "WithdrawalRequestCreated");
    });

    it("should authorize a withdrawal request", async function () {
        const code = 1234;
        const salt = 5678;
        const userHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [code, salt]));
        const secretHash = ethers.keccak256(userHash);
        //const amount = ethers.parseUnits("100", 18);
        const amount = ethers.parseEther("100");
        //console.log("secretHash",secretHash);

        // Création de la requête
        await withdrawalInstance.connect(mockSafeSigner).createWithdrawal(secretHash, amount);
        const block = await ethers.provider.getBlock("latest");
        const timelimit = (block.timestamp + 604800);

        //
        // Simulate the user approving spend as the mockSafe Safe4337 module
        await mockSafe.connect(mockSafeSigner).mockTransferFrom(user.address);
        xCHF.connect(user).approve(mockSafeSigner.address,amount);
        await expect(withdrawalInstance.connect(mockSafeSigner).authorizeWithdrawal(code, salt, recipient.address))
            .to.emit(withdrawalInstance, "Withdrawal")
            .withArgs(amount, recipient.address,timelimit);

        // console.log("xCHF",await xCHF.getAddress());
        // console.log("user",user.address);
        // console.log("recipient",recipient.address);


        // Vérification du solde du destinataire
        const recipientBalance = await xCHF.balanceOf(recipient.address);
        expect(recipientBalance).to.equal(amount);

        // Vérification du solde de l'utilisateur
        const userBalance = await xCHF.balanceOf(user.address);
        const userAmount = ethers.parseEther("400");
        expect(userBalance).to.equal(userAmount);

        
    });

    it("should reject expired withdrawal requests", async function () {
        const code = 1234;
        const salt = 5678;
        const userHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [code, salt]));
        const secretHash = ethers.keccak256(userHash);
        const amount = ethers.parseEther("100");

        // Création de la requête
        await withdrawalInstance.connect(mockSafeSigner).createWithdrawal(secretHash, amount);

        // Simulation d'expiration
        await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // +7 jours
        await network.provider.send("evm_mine");

        // Tentative d'autorisation après expiration
        await expect(withdrawalInstance.connect(mockSafeSigner).authorizeWithdrawal(code, salt, recipient.address))
            .to.be.revertedWith("Withdrawal request expired");
    });
});
